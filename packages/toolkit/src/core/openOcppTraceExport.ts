/**
 * Open OCPP Trace format exporter.
 *
 * Emits DebugKit's internal events as the vendor-neutral Open OCPP Trace
 * interchange format (https://github.com/open-ocpp-trace/specification), one
 * record per event, so any trace the toolkit can parse becomes a file other
 * OCPP tools can consume. The producer counterpart of `parseOpenOcppTrace`.
 *
 * Producer rules implemented here:
 * - `raw` is emitted for every record, serialized from the stored frame, and
 *   decodes to exactly the fields the record decomposes.
 * - `action` on a CALLRESULT/CALLERROR is back-filled by messageId
 *   correlation and therefore always equals the correlated CALL's action.
 * - The format requires `timestamp` and a concrete `direction`; events
 *   missing either (for example from the bare-array input format, which has
 *   no timestamps) are skipped with a warning rather than inventing data.
 * - Nothing is emitted outside the declared fields; producer extensions
 *   would belong under `meta`, and this exporter emits none.
 */

import type { Direction, Event, MessageType, ParseWarning } from './types.js';
import { OPEN_OCPP_TRACE_SCHEMA_VERSION } from './openOcppTrace.js';
import type {
  OpenOcppTraceDirection,
  OpenOcppTraceMessageType,
  OpenOcppTraceRecord,
} from './openOcppTrace.js';

/** Trace-level fields the internal event model does not carry. */
export interface OpenOcppTraceExportOptions {
  /** OCPP protocol version to stamp on every record (e.g. "1.6"). */
  ocppVersion?: string;
  /** Charge-point identity to stamp on every record. */
  chargePointId?: string;
}

/** Result of an export: the records plus warnings for skipped events. */
export interface OpenOcppTraceExportResult {
  records: OpenOcppTraceRecord[];
  warnings: ParseWarning[];
}

const DIRECTION_TO_WIRE: Partial<Record<Direction, OpenOcppTraceDirection>> = {
  CS_TO_CSMS: 'cp-to-csms',
  CSMS_TO_CS: 'csms-to-cp',
};

const MESSAGE_TYPE_TO_WIRE: Record<MessageType, OpenOcppTraceMessageType> = {
  Call: 'CALL',
  CallResult: 'CALLRESULT',
  CallError: 'CALLERROR',
};

/**
 * Back-fill response actions by correlation: a response takes the action of
 * the most recent preceding CALL with the same messageId, the opposite
 * direction, that is not already answered. Derived from the full internal
 * event list, so a response can carry its action even when its CALL is
 * skipped from the export.
 */
function deriveResponseActions(events: Event[]): Map<number, string> {
  const derived = new Map<number, string>();
  const answered = new Set<number>();

  for (let i = 0; i < events.length; i++) {
    const response = events[i];
    if (response === undefined || response.messageType === 'Call') continue;
    for (let j = i - 1; j >= 0; j--) {
      const call = events[j];
      if (
        call !== undefined &&
        call.messageType === 'Call' &&
        call.messageId === response.messageId &&
        call.direction !== 'UNKNOWN' &&
        response.direction !== 'UNKNOWN' &&
        call.direction !== response.direction &&
        !answered.has(j)
      ) {
        answered.add(j);
        if (call.action !== null) derived.set(i, call.action);
        break;
      }
    }
  }

  return derived;
}

/** Lift a top-level integer connectorId from a CALL payload, when present. */
function liftConnectorId(event: Event): number | undefined {
  if (event.messageType !== 'Call') return undefined;
  const payload = event.payload;
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) return undefined;
  const connectorId = (payload as Record<string, unknown>).connectorId;
  return typeof connectorId === 'number' && Number.isInteger(connectorId) && connectorId >= 0
    ? connectorId
    : undefined;
}

/**
 * Export internal events as Open OCPP Trace records (schema version 1.1).
 *
 * Events the format cannot represent (no timestamp, or direction `UNKNOWN`)
 * are skipped with a warning; the warning `index` is the event's position in
 * the input array.
 */
export function toOpenOcppTraceRecords(
  events: Event[],
  options: OpenOcppTraceExportOptions = {},
): OpenOcppTraceExportResult {
  const records: OpenOcppTraceRecord[] = [];
  const warnings: ParseWarning[] = [];
  const responseActions = deriveResponseActions(events);

  events.forEach((event, index) => {
    const direction = DIRECTION_TO_WIRE[event.direction];
    if (direction === undefined) {
      warnings.push({
        index,
        message: `Event ${index + 1} (${event.id}): direction is unknown; the format requires one. Skipped.`,
      });
      return;
    }
    if (event.timestamp === null) {
      warnings.push({
        index,
        message: `Event ${index + 1} (${event.id}): has no timestamp; the format requires one. Skipped.`,
      });
      return;
    }
    if (event.messageType === 'Call' && event.action === null) {
      warnings.push({
        index,
        message: `Event ${index + 1} (${event.id}): CALL without an action cannot be exported. Skipped.`,
      });
      return;
    }

    const frame = event.rawMessage;
    const action =
      event.messageType === 'Call' ? (event.action ?? undefined) : responseActions.get(index);
    const payload =
      event.messageType === 'Call'
        ? frame[3]
        : event.messageType === 'CallResult'
          ? frame[2]
          : undefined;
    const connectorId = liftConnectorId(event);

    // Assembled in the format's documented field order for stable output.
    const record: OpenOcppTraceRecord = {
      schemaVersion: OPEN_OCPP_TRACE_SCHEMA_VERSION,
      timestamp: new Date(event.timestamp).toISOString(),
      ...(options.ocppVersion !== undefined && { ocppVersion: options.ocppVersion }),
      transport: 'json',
      ...(options.chargePointId !== undefined && { chargePointId: options.chargePointId }),
      ...(connectorId !== undefined && { connectorId }),
      direction,
      messageType: MESSAGE_TYPE_TO_WIRE[event.messageType],
      messageId: event.messageId,
      ...(action !== undefined && { action }),
      ...(payload !== undefined && { payload }),
      raw: JSON.stringify(frame),
      ...(event.messageType === 'CallError' && {
        error: {
          ...(typeof frame[2] === 'string' && { code: frame[2] }),
          ...(typeof frame[3] === 'string' && { description: frame[3] }),
          ...(frame.length >= 5 && { details: frame[4] }),
        },
      }),
    };

    records.push(record);
  });

  return { records, warnings };
}

/**
 * Export internal events as an Open OCPP Trace JSONL document (one record per
 * line, trailing newline when non-empty).
 */
export function toOpenOcppTraceJsonl(
  events: Event[],
  options: OpenOcppTraceExportOptions = {},
): { jsonl: string; warnings: ParseWarning[] } {
  const { records, warnings } = toOpenOcppTraceRecords(events, options);
  const jsonl =
    records.length === 0 ? '' : records.map((record) => JSON.stringify(record)).join('\n') + '\n';
  return { jsonl, warnings };
}
