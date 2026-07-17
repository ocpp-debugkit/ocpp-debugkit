/**
 * Trace parser — accepts untrusted input in JSON Object, JSONL, or bare array
 * format and produces normalized `Event` objects with warnings for malformed
 * entries.
 *
 * Security:
 * - Safe JSON parsing with try/catch
 * - Input size limit (10 MB)
 * - Event count limit (10,000)
 * - Zod schema validation prevents prototype pollution
 * - Malformed individual events are skipped with a `ParseWarning`
 * - Structural errors (invalid JSON, missing events array) fail fast
 *
 * @see ADR-0002 (input trace formats)
 * @see ADR-0007 (malformed trace handling)
 * @see docs/trace-format-spec.md
 */

import {
  bareArraySchema,
  rawOcppMessageSchema,
  traceEventInputSchema,
  traceSchema,
} from './schemas.js';
import { normalizeEvents } from './normalizer.js';
import { ParseError, validateInputSize, validateEventCount } from './parseLimits.js';
import { looksLikeOpenOcppTrace, parseOpenOcppTrace } from './openOcppTrace.js';
import type { Event, ParseResult, ParseWarning, TraceEventInput } from './types.js';

// The untrusted-input limits and the parse error type live in `parseLimits.ts`
// so every input path shares them. Re-exported here to keep their public
// import path (`@ocpp-debugkit/toolkit/core`) unchanged.
export { ParseError, MAX_INPUT_SIZE_BYTES, MAX_EVENT_COUNT } from './parseLimits.js';

// ---------------------------------------------------------------------------
// Format detection
// ---------------------------------------------------------------------------

/**
 * Detect the trace format by examining the input string.
 *
 * - JSONL: multiple lines, first non-empty line starts with `{` and parses as JSON
 * - JSON Object: starts with `{`
 * - Bare Array: starts with `[`
 *
 * This function does NOT validate the full content — it just determines
 * which parsing strategy to use.
 */
export type TraceFormat = 'json-object' | 'jsonl' | 'bare-array';

function detectFormat(input: string): TraceFormat {
  const trimmed = input.trim();

  if (trimmed.startsWith('{')) {
    // Could be JSON Object format or JSONL starting with an event object.
    // JSONL has multiple lines; a JSON Object is a single JSON value.
    // We check if the trimmed input contains a newline followed by another `{`
    // that is NOT inside a string (simplified check: if the last non-whitespace
    // character is `}`, and there's content after the first `}`... but that's
    // complex. Simpler: try parsing as a single JSON value first, and if that
    // fails, try JSONL.
    return 'json-object';
  }

  if (trimmed.startsWith('[')) {
    return 'bare-array';
  }

  // Default to JSONL for other cases (each line is a JSON object)
  return 'jsonl';
}

// ---------------------------------------------------------------------------
// JSONL parsing
// ---------------------------------------------------------------------------

/**
 * Parse JSONL input: one event per line.
 * Blank lines are ignored. Malformed lines produce warnings.
 *
 * @returns array of valid TraceEventInput and warnings for malformed lines.
 */
function parseJsonl(input: string): { events: TraceEventInput[]; warnings: ParseWarning[] } {
  const lines = input.split('\n');
  const events: TraceEventInput[] = [];
  const warnings: ParseWarning[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;
    const trimmed = line.trim();
    if (trimmed === '') {
      continue; // Skip blank lines
    }

    try {
      const parsed: unknown = JSON.parse(trimmed);
      const result = traceEventInputSchema.safeParse(parsed);
      if (result.success) {
        events.push(result.data);
      } else {
        warnings.push({
          index: i,
          message: `Line ${i + 1}: invalid event structure — ${result.error.issues[0]?.message ?? 'unknown error'}`,
          rawInput: trimmed.slice(0, 200),
        });
      }
    } catch (e) {
      warnings.push({
        index: i,
        message: `Line ${i + 1}: invalid JSON — ${e instanceof Error ? e.message : 'unknown error'}`,
        rawInput: trimmed.slice(0, 200),
      });
    }
  }

  return { events, warnings };
}

// ---------------------------------------------------------------------------
// Bare array parsing
// ---------------------------------------------------------------------------

/**
 * Parse bare array format: `[ [2, "id", "Action", {...}], [3, "id", {...}], ... ]`
 *
 * Each element is a raw OCPP message. Direction is inferred; timestamp is null.
 */
function parseBareArray(input: string): { events: TraceEventInput[]; warnings: ParseWarning[] } {
  const warnings: ParseWarning[] = [];

  try {
    const parsed: unknown = JSON.parse(input);
    const result = bareArraySchema.safeParse(parsed);
    if (!result.success) {
      throw new ParseError(
        `Invalid bare array format — ${result.error.issues[0]?.message ?? 'unknown error'}`,
      );
    }

    // Convert raw messages to TraceEventInput (with null timestamp, no direction)
    const events: TraceEventInput[] = result.data.map((message) => ({
      timestamp: null,
      direction: undefined,
      message,
    }));

    return { events, warnings };
  } catch (e) {
    if (e instanceof ParseError) throw e;
    throw new ParseError(
      `Invalid JSON in bare array format — ${e instanceof Error ? e.message : 'unknown error'}`,
    );
  }
}

// ---------------------------------------------------------------------------
// JSON Object parsing
// ---------------------------------------------------------------------------

/**
 * Parse JSON Object format: `{ "traceId": ..., "metadata": ..., "events": [...] }`
 *
 * Also handles the case where the JSON Object contains an array of raw messages
 * in the `events` field (degenerate — treated as bare messages without timestamp/direction).
 */
function parseJsonObject(input: string): { events: TraceEventInput[]; warnings: ParseWarning[] } {
  let parsed: unknown;

  try {
    parsed = JSON.parse(input);
  } catch (e) {
    throw new ParseError(`Invalid JSON — ${e instanceof Error ? e.message : 'unknown error'}`);
  }

  // If the parsed value is an array, treat it as a bare array (degenerate JSON Object)
  if (Array.isArray(parsed)) {
    return parseBareArray(input);
  }

  const result = traceSchema.safeParse(parsed);
  if (!result.success) {
    throw new ParseError(
      `Invalid trace structure — ${result.error.issues[0]?.message ?? 'unknown error'}`,
    );
  }

  const trace = result.data;
  const warnings: ParseWarning[] = [];
  const events: TraceEventInput[] = [];

  // Validate each event individually — malformed events are skipped with warnings
  for (let i = 0; i < trace.events.length; i++) {
    const eventInput = trace.events[i];
    if (eventInput === undefined) continue;

    // Re-validate the individual message (the schema already validated the
    // overall structure, but we want to catch edge cases in the message array)
    const msgResult = rawOcppMessageSchema.safeParse(eventInput.message);
    if (!msgResult.success) {
      warnings.push({
        index: i,
        message: `Event ${i + 1}: invalid OCPP message — ${msgResult.error.issues[0]?.message ?? 'unknown error'}`,
      });
      continue;
    }

    events.push({
      timestamp: eventInput.timestamp ?? null,
      direction: eventInput.direction,
      message: msgResult.data,
    });
  }

  if (events.length === 0) {
    throw new ParseError('Trace contains no valid events after parsing.');
  }

  return { events, warnings };
}

// ---------------------------------------------------------------------------
// parseTrace()
// ---------------------------------------------------------------------------

/**
 * Parse a trace from a raw string input.
 *
 * Accepts:
 * - JSON Object format (metadata + events array)
 * - JSONL format (one event per line)
 * - Bare array format (array of raw OCPP message arrays)
 *
 * @param input - Raw trace string (untrusted)
 * @returns ParseResult with normalized events and warnings for malformed entries
 * @throws {ParseError} for structural errors (invalid JSON, missing events, size/count limits exceeded)
 *
 * @see ADR-0002, ADR-0007
 */
export function parseTrace(input: string): ParseResult {
  // Validate input size
  validateInputSize(input);

  const trimmed = input.trim();
  if (trimmed === '') {
    throw new ParseError('Input is empty.');
  }

  // The Open OCPP Trace interchange format (records with `messageType` +
  // `direction`) has its own parser; detect and delegate before the internal
  // format detection, which does not recognize it.
  if (looksLikeOpenOcppTrace(trimmed)) {
    return parseOpenOcppTrace(trimmed);
  }

  // Detect format and parse accordingly
  const format = detectFormat(trimmed);

  let events: TraceEventInput[];
  let warnings: ParseWarning[];

  if (format === 'bare-array') {
    const result = parseBareArray(trimmed);
    events = result.events;
    warnings = result.warnings;
  } else if (format === 'jsonl') {
    const result = parseJsonl(trimmed);
    events = result.events;
    warnings = result.warnings;
  } else {
    // json-object — but it might actually be JSONL if JSON.parse fails
    try {
      const result = parseJsonObject(trimmed);
      events = result.events;
      warnings = result.warnings;
    } catch (e) {
      if (e instanceof ParseError) {
        // If JSON Object parsing fails, try JSONL as a fallback
        // (input starts with `{` but might be JSONL with event objects)
        const jsonlResult = parseJsonl(trimmed);
        if (jsonlResult.events.length > 0) {
          events = jsonlResult.events;
          warnings = jsonlResult.warnings;
        } else {
          throw e;
        }
      } else {
        throw e;
      }
    }
  }

  // Validate event count
  validateEventCount(events.length);

  if (events.length === 0) {
    throw new ParseError('Trace contains no valid events.');
  }

  // Normalize events into canonical Event objects
  const normalizedEvents: Event[] = normalizeEvents(events);

  return {
    events: normalizedEvents,
    warnings,
  };
}
