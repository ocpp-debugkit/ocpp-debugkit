/**
 * Open OCPP Trace format adapter.
 *
 * Reads the vendor-neutral Open OCPP Trace interchange format
 * (https://github.com/open-ocpp-trace/specification) into DebugKit's internal
 * event model, so traces produced by other tools can be inspected, analyzed,
 * diffed, and replayed here.
 *
 * The format is a stream of records (JSONL, or a JSON array of records), each
 * describing one OCPP-J frame. This module maps a record onto the internal
 * `RawOcppMessage` frame and reuses the normal `normalizeEvents` pipeline, so
 * downstream analysis is identical to any other input format.
 *
 * Two behaviors are specific to the format:
 * - `raw`, when present, is the authoritative frame. Any disagreement between
 *   `raw` and the decomposed fields is surfaced as a warning (raw still wins),
 *   consistent with the skip-and-flag policy for untrusted input (ADR-0007).
 * - Responses (CALLRESULT/CALLERROR) may omit `action`; the effective action
 *   is derived by messageId correlation. `deriveOpenOcppTraceView` exposes that
 *   correlation as the format's consumer view, the same view the specification's
 *   conformance fixtures pin down.
 *
 * @see ADR-0007 (malformed trace handling)
 */

import { z } from 'zod';
import { rawOcppMessageSchema } from './schemas.js';
import { normalizeEvents } from './normalizer.js';
import { ParseError, validateInputSize, validateEventCount } from './parseLimits.js';
import type {
  Direction,
  Event,
  ParseResult,
  ParseWarning,
  RawOcppMessage,
  TraceEventInput,
} from './types.js';

/** The Open OCPP Trace schema version this adapter targets. */
export const OPEN_OCPP_TRACE_SCHEMA_VERSION = '1.1';

// ---------------------------------------------------------------------------
// Record type + schema
// ---------------------------------------------------------------------------

/** Wire direction as expressed by the Open OCPP Trace format. */
export type OpenOcppTraceDirection = 'cp-to-csms' | 'csms-to-cp';

/** OCPP-J frame kind as expressed by the Open OCPP Trace format. */
export type OpenOcppTraceMessageType = 'CALL' | 'CALLRESULT' | 'CALLERROR';

/**
 * A single Open OCPP Trace record (format major version 1).
 * Unknown fields are ignored on input for forward compatibility.
 */
export interface OpenOcppTraceRecord {
  schemaVersion: string;
  timestamp: string;
  ocppVersion?: string;
  transport: 'json' | 'soap';
  chargePointId?: string;
  connectorId?: number;
  direction: OpenOcppTraceDirection;
  messageType: OpenOcppTraceMessageType;
  messageId?: string;
  action?: string;
  payload?: unknown;
  raw?: string;
  error?: { code?: string; description?: string; details?: unknown };
  meta?: Record<string, unknown>;
}

// Object schemas strip unknown keys by default, which is exactly the
// forward-compatibility rule: unknown fields are ignored, not rejected.
const openOcppTraceRecordSchema = z.object({
  schemaVersion: z.string(),
  timestamp: z.string(),
  ocppVersion: z.string().optional(),
  transport: z.enum(['json', 'soap']),
  chargePointId: z.string().optional(),
  connectorId: z.number().int().nonnegative().optional(),
  direction: z.enum(['cp-to-csms', 'csms-to-cp']),
  messageType: z.enum(['CALL', 'CALLRESULT', 'CALLERROR']),
  messageId: z.string().optional(),
  action: z.string().optional(),
  payload: z.unknown().optional(),
  raw: z.string().optional(),
  error: z
    .object({
      code: z.string().optional(),
      description: z.string().optional(),
      details: z.unknown().optional(),
    })
    .optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

function isRecordShape(value: unknown): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  const messageType = record.messageType;
  const direction = record.direction;
  return (
    (messageType === 'CALL' || messageType === 'CALLRESULT' || messageType === 'CALLERROR') &&
    (direction === 'cp-to-csms' || direction === 'csms-to-cp')
  );
}

/**
 * Cheap, allocation-light check for whether an input is the Open OCPP Trace
 * format. Examines only the first record (first array element, or first
 * non-empty line for JSONL). Never throws; returns false on anything it can't
 * confidently identify, so `parseTrace` can fall through to its own detection.
 */
export function looksLikeOpenOcppTrace(input: string): boolean {
  const trimmed = input.trim();
  if (trimmed === '') return false;

  try {
    if (trimmed.startsWith('[')) {
      const parsed: unknown = JSON.parse(trimmed);
      if (!Array.isArray(parsed) || parsed.length === 0) return false;
      return isRecordShape(parsed[0]);
    }
    const firstLine = trimmed
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line !== '');
    if (firstLine === undefined) return false;
    return isRecordShape(JSON.parse(firstLine));
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Record extraction + validation
// ---------------------------------------------------------------------------

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'unknown error';
}

/** Split input into per-record JSON values (JSON array or JSONL). */
function extractRawRecords(input: string): { values: unknown[]; warnings: ParseWarning[] } {
  const warnings: ParseWarning[] = [];

  if (input.startsWith('[')) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(input);
    } catch (e) {
      throw new ParseError(`Invalid JSON array - ${errorMessage(e)}`);
    }
    if (!Array.isArray(parsed)) {
      throw new ParseError('Expected a JSON array of Open OCPP Trace records.');
    }
    return { values: parsed, warnings };
  }

  const values: unknown[] = [];
  const lines = input.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]?.trim() ?? '';
    if (line === '') continue;
    try {
      values.push(JSON.parse(line));
    } catch (e) {
      warnings.push({
        index: i,
        message: `Line ${i + 1}: invalid JSON - ${errorMessage(e)}`,
        rawInput: line.slice(0, 200),
      });
    }
  }
  return { values, warnings };
}

/** Validate extracted values into records, flagging malformed ones. */
function parseRecords(input: string): { records: OpenOcppTraceRecord[]; warnings: ParseWarning[] } {
  const { values, warnings } = extractRawRecords(input);
  const records: OpenOcppTraceRecord[] = [];

  values.forEach((value, i) => {
    const result = openOcppTraceRecordSchema.safeParse(value);
    if (result.success) {
      records.push(result.data as OpenOcppTraceRecord);
    } else {
      warnings.push({
        index: i,
        message: `Record ${i + 1}: invalid Open OCPP Trace record - ${
          result.error.issues[0]?.message ?? 'unknown error'
        }`,
      });
    }
  });

  return { records, warnings };
}

// ---------------------------------------------------------------------------
// Record -> internal frame mapping
// ---------------------------------------------------------------------------

function mapDirection(direction: OpenOcppTraceDirection): Direction {
  return direction === 'cp-to-csms' ? 'CS_TO_CSMS' : 'CSMS_TO_CS';
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keysA = Object.keys(a as object);
  const keysB = Object.keys(b as object);
  if (keysA.length !== keysB.length) return false;
  return keysA.every(
    (key) =>
      Object.hasOwn(b as object, key) &&
      deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]),
  );
}

/** Reconstruct the OCPP-J frame from the record's decomposed fields. */
function frameFromFields(
  rec: OpenOcppTraceRecord,
  messageId: string,
  index: number,
  warnings: ParseWarning[],
): RawOcppMessage | undefined {
  switch (rec.messageType) {
    case 'CALL':
      if (rec.action === undefined) {
        warnings.push({ index, message: `Record ${index + 1}: CALL record has no action.` });
        return undefined;
      }
      return [2, messageId, rec.action, rec.payload ?? {}];
    case 'CALLRESULT':
      return [3, messageId, rec.payload ?? {}];
    case 'CALLERROR': {
      const code = rec.error?.code;
      if (code === undefined) {
        warnings.push({
          index,
          message: `Record ${index + 1}: CALLERROR record has no error.code.`,
        });
        return undefined;
      }
      return [4, messageId, code, rec.error?.description ?? '', rec.error?.details ?? {}];
    }
  }
}

/** Flag any disagreement between `raw` and the decomposed fields (raw wins). */
function checkRawAgreement(
  frame: RawOcppMessage,
  rec: OpenOcppTraceRecord,
  index: number,
  warnings: ParseWarning[],
): void {
  const typeId = frame[0];
  const rawType: OpenOcppTraceMessageType =
    typeId === 2 ? 'CALL' : typeId === 3 ? 'CALLRESULT' : 'CALLERROR';

  const disagree = (field: string): void => {
    warnings.push({
      index,
      message: `Record ${index + 1}: raw frame disagrees with the record's ${field}; using raw.`,
    });
  };

  if (rawType !== rec.messageType) disagree('messageType');
  if (rec.messageId !== undefined && frame[1] !== rec.messageId) disagree('messageId');
  if (rawType === 'CALL' && rec.action !== undefined && frame[2] !== rec.action) disagree('action');
  if (rawType === 'CALLERROR' && rec.error?.code !== undefined && frame[2] !== rec.error.code) {
    disagree('error.code');
  }

  const rawPayload =
    rawType === 'CALL' ? frame[3] : rawType === 'CALLRESULT' ? frame[2] : undefined;
  if (
    rec.payload !== undefined &&
    rawPayload !== undefined &&
    !deepEqual(rawPayload, rec.payload)
  ) {
    disagree('payload');
  }
}

/** Parse `raw` into a frame, or return undefined (with a warning) to fall back. */
function frameFromRaw(
  rec: OpenOcppTraceRecord,
  index: number,
  warnings: ParseWarning[],
): RawOcppMessage | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rec.raw as string);
  } catch {
    warnings.push({
      index,
      message: `Record ${index + 1}: raw is not valid JSON; using decomposed fields.`,
    });
    return undefined;
  }
  const result = rawOcppMessageSchema.safeParse(parsed);
  if (!result.success) {
    warnings.push({
      index,
      message: `Record ${index + 1}: raw is not a valid OCPP-J frame; using decomposed fields.`,
    });
    return undefined;
  }
  const frame = result.data as RawOcppMessage;
  checkRawAgreement(frame, rec, index, warnings);
  return frame;
}

function recordToEventInput(
  rec: OpenOcppTraceRecord,
  index: number,
): { input?: TraceEventInput; warnings: ParseWarning[] } {
  const warnings: ParseWarning[] = [];

  if (rec.messageId === undefined) {
    warnings.push({
      index,
      message: `Record ${index + 1}: has no messageId and cannot be mapped to an event.`,
    });
    return { warnings };
  }

  // `raw` is the authoritative frame when present and usable; otherwise
  // reconstruct it from the decomposed fields. (Record-level metadata beyond
  // the frame, such as ocppVersion / transport / connectorId / meta, has no
  // slot in the internal event model and is not surfaced yet.)
  let frame: RawOcppMessage | undefined;
  if (rec.raw !== undefined) {
    frame = frameFromRaw(rec, index, warnings);
  }
  if (frame === undefined) {
    frame = frameFromFields(rec, rec.messageId, index, warnings);
  }
  if (frame === undefined) return { warnings };

  const validated = rawOcppMessageSchema.safeParse(frame);
  if (!validated.success) {
    warnings.push({
      index,
      message: `Record ${index + 1}: does not form a valid OCPP-J frame - ${
        validated.error.issues[0]?.message ?? 'unknown error'
      }`,
    });
    return { warnings };
  }

  return {
    input: {
      timestamp: rec.timestamp,
      direction: mapDirection(rec.direction),
      message: validated.data as RawOcppMessage,
    },
    warnings,
  };
}

// ---------------------------------------------------------------------------
// parseOpenOcppTrace()
// ---------------------------------------------------------------------------

/**
 * Parse an Open OCPP Trace document into normalized DebugKit events.
 *
 * Accepts JSONL (one record per line) or a JSON array of records. Applies the
 * same untrusted-input limits as {@link parseTrace}. Malformed records are
 * skipped with a warning rather than aborting the parse.
 *
 * @throws {ParseError} for structural errors (invalid JSON array, size/count
 * limits, or a document with no usable records).
 */
export function parseOpenOcppTrace(input: string): ParseResult {
  validateInputSize(input);

  const trimmed = input.trim();
  if (trimmed === '') {
    throw new ParseError('Input is empty.');
  }

  const { records, warnings } = parseRecords(trimmed);

  const eventInputs: TraceEventInput[] = [];
  records.forEach((rec, i) => {
    const mapped = recordToEventInput(rec, i);
    warnings.push(...mapped.warnings);
    if (mapped.input !== undefined) eventInputs.push(mapped.input);
  });

  validateEventCount(eventInputs.length);
  if (eventInputs.length === 0) {
    throw new ParseError('Trace contains no valid Open OCPP Trace records.');
  }

  const events: Event[] = normalizeEvents(eventInputs);
  return { events, warnings };
}

// ---------------------------------------------------------------------------
// Consumer view (conformance)
// ---------------------------------------------------------------------------

/** One record's entry in the consumer view. */
export interface OpenOcppTraceViewRecord {
  index: number;
  messageType: OpenOcppTraceMessageType;
  messageId?: string;
  /** Effective action: explicit for a CALL, derived by correlation for a response. */
  action?: string;
  /** Index of the correlated CALL, for a correlated response. */
  correlatesWith?: number;
}

/**
 * The consumer view of an Open OCPP Trace document: the correlation structure a
 * conformant consumer derives from it. This is the shape the specification's
 * conformance fixtures (`expected.json`) pin down.
 */
export interface OpenOcppTraceView {
  schemaVersion: string;
  counts: { records: number; calls: number; callResults: number; callErrors: number };
  records: OpenOcppTraceViewRecord[];
  unansweredCalls: number[];
  orphanResponses: number[];
}

/**
 * Find the CALL a response correlates with: the most recent preceding CALL with
 * the same messageId, the opposite direction, that is not already answered.
 */
function findCall(
  records: OpenOcppTraceRecord[],
  responseIndex: number,
  answered: Set<number>,
): number {
  const response = records[responseIndex];
  if (response?.messageId === undefined) return -1;
  for (let j = responseIndex - 1; j >= 0; j--) {
    const candidate = records[j];
    if (
      candidate !== undefined &&
      candidate.messageType === 'CALL' &&
      candidate.messageId === response.messageId &&
      candidate.direction !== response.direction &&
      !answered.has(j)
    ) {
      return j;
    }
  }
  return -1;
}

function buildView(records: OpenOcppTraceRecord[]): OpenOcppTraceView {
  const view: OpenOcppTraceViewRecord[] = records.map((rec, index) => {
    const entry: OpenOcppTraceViewRecord = { index, messageType: rec.messageType };
    if (rec.messageId !== undefined) entry.messageId = rec.messageId;
    if (rec.messageType === 'CALL' && rec.action !== undefined) entry.action = rec.action;
    return entry;
  });

  const answered = new Set<number>();
  const orphanResponses: number[] = [];

  for (let i = 0; i < records.length; i++) {
    if (records[i]?.messageType === 'CALL') continue;
    const match = findCall(records, i, answered);
    if (match === -1) {
      orphanResponses.push(i);
    } else {
      answered.add(match);
      const entry = view[i];
      const callAction = records[match]?.action;
      if (entry !== undefined) {
        if (callAction !== undefined) entry.action = callAction;
        entry.correlatesWith = match;
      }
    }
  }

  const unansweredCalls: number[] = [];
  records.forEach((rec, i) => {
    if (rec.messageType === 'CALL' && !answered.has(i)) unansweredCalls.push(i);
  });

  return {
    schemaVersion: records[0]?.schemaVersion ?? OPEN_OCPP_TRACE_SCHEMA_VERSION,
    counts: {
      records: records.length,
      calls: records.filter((r) => r.messageType === 'CALL').length,
      callResults: records.filter((r) => r.messageType === 'CALLRESULT').length,
      callErrors: records.filter((r) => r.messageType === 'CALLERROR').length,
    },
    records: view,
    unansweredCalls,
    orphanResponses,
  };
}

/**
 * Derive the {@link OpenOcppTraceView} for an Open OCPP Trace document. This is
 * DebugKit acting as a reference consumer of the format: given a trace, it
 * reports the correlation structure (pairs, effective actions, unanswered
 * calls, orphan responses) that any conformant consumer must produce.
 */
export function deriveOpenOcppTraceView(input: string): OpenOcppTraceView {
  validateInputSize(input);
  const { records } = parseRecords(input.trim());
  return buildView(records);
}
