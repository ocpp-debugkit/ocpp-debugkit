/**
 * Event normalizer — transforms raw trace event inputs into canonical
 * `Event` objects with classified message type, direction, and timestamps.
 *
 * @see ADR-0003 (canonical event model)
 * @see ADR-0004 (message direction)
 * @see ADR-0005 (timestamp normalization)
 */

import type { Direction, Event, MessageType, TraceEventInput, RawOcppMessage } from './types.js';

// ---------------------------------------------------------------------------
// Direction inference (ADR-0004)
// ---------------------------------------------------------------------------

/**
 * Actions initiated by the Charge Point (CS → CSMS).
 * These are OCPP 1.6 actions sent FROM the station TO the CSMS.
 */
const CS_TO_CSMS_ACTIONS = new Set([
  'BootNotification',
  'Heartbeat',
  'Authorize',
  'StartTransaction',
  'StopTransaction',
  'StatusNotification',
  'MeterValues',
  'DataTransfer',
  'DiagnosticsStatusNotification',
  'FirmwareStatusNotification',
  'SecurityEventNotification',
  'SignCertificate',
  'SignedFirmwareStatusNotification',
  'LogStatusNotification',
]);

/**
 * Actions initiated by the CSMS (CSMS → CS).
 * These are OCPP 1.6 actions sent FROM the CSMS TO the station.
 */
const CSMS_TO_CS_ACTIONS = new Set([
  'Reset',
  'RemoteStartTransaction',
  'RemoteStopTransaction',
  'GetConfiguration',
  'ChangeConfiguration',
  'SetChargingProfile',
  'ClearChargingProfile',
  'ChangeAvailability',
  'ReserveNow',
  'CancelReservation',
  'DataTransfer',
  'GetLocalListVersion',
  'SendLocalList',
  'TriggerMessage',
  'UnlockConnector',
  'GetDiagnostics',
  'UpdateFirmware',
  'ExtendedTriggerMessage',
  'GetLog',
  'SignedUpdateFirmware',
  'CertificateSigned',
  'DeleteCertificate',
  'GetInstalledCertificateIds',
  'InstallCertificate',
]);

/**
 * Infer the direction of a Call message from its action name (ADR-0004).
 * - If the action is known to be CS→CSMS, return 'CS_TO_CSMS'.
 * - If the action is known to be CSMS→CS, return 'CSMS_TO_CS'.
 * - If the action is not recognized, return 'UNKNOWN'.
 *
 * For CallResult/CallError, the direction is the reverse of the original Call.
 * Since we don't have the original Call's direction here, we infer based on
 * the matched Call's action. For responses without a matched Call, we use
 * 'UNKNOWN'.
 */
export function inferDirection(messageType: MessageType, action: string | null): Direction {
  if (messageType === 'Call' && action !== null) {
    if (CS_TO_CSMS_ACTIONS.has(action)) return 'CS_TO_CSMS';
    if (CSMS_TO_CS_ACTIONS.has(action)) return 'CSMS_TO_CS';
    return 'UNKNOWN';
  }
  // For CallResult/CallError, direction should be the reverse of the Call.
  // We can't know for certain without matching — return UNKNOWN.
  // The parser will resolve this after matching Calls to responses.
  return 'UNKNOWN';
}

/**
 * Determine the reverse direction for a response.
 * Call CS→CSMS → Response CSMS→CS, and vice versa.
 */
export function reverseDirection(dir: Direction): Direction {
  switch (dir) {
    case 'CS_TO_CSMS':
      return 'CSMS_TO_CS';
    case 'CSMS_TO_CS':
      return 'CS_TO_CSMS';
    case 'UNKNOWN':
      return 'UNKNOWN';
  }
}

// ---------------------------------------------------------------------------
// Timestamp normalization (ADR-0005)
// ---------------------------------------------------------------------------

/**
 * Threshold for distinguishing Unix epoch seconds from milliseconds.
 * Values below 10^12 are treated as seconds; above as milliseconds.
 * (10^12 = year ~33658 in ms, year ~2001 in s)
 */
const EPOCH_MS_THRESHOLD = 1e12;

/**
 * Normalize a timestamp to epoch milliseconds.
 *
 * Accepts:
 * - ISO 8601 strings (UTC or with offset)
 * - Unix epoch in milliseconds (number >= 10^12)
 * - Unix epoch in seconds (number < 10^12)
 * - null/undefined → null
 *
 * @returns epoch milliseconds, or null if the timestamp is missing or invalid.
 */
export function normalizeTimestamp(timestamp: string | number | null | undefined): number | null {
  if (timestamp === null || timestamp === undefined) {
    return null;
  }

  if (typeof timestamp === 'number') {
    if (!Number.isFinite(timestamp)) {
      return null;
    }
    // Detect seconds vs milliseconds
    return timestamp < EPOCH_MS_THRESHOLD ? Math.round(timestamp * 1000) : Math.round(timestamp);
  }

  if (typeof timestamp === 'string') {
    const trimmed = timestamp.trim();
    if (trimmed === '') {
      return null;
    }
    // Try parsing as a number first (stringified epoch)
    const asNum = Number(trimmed);
    if (Number.isFinite(asNum)) {
      return asNum < EPOCH_MS_THRESHOLD ? Math.round(asNum * 1000) : Math.round(asNum);
    }
    // Parse as ISO 8601
    const parsed = Date.parse(trimmed);
    if (Number.isNaN(parsed)) {
      return null;
    }
    return parsed;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Message type classification
// ---------------------------------------------------------------------------

/**
 * Classify the OCPP message type from the raw message array.
 * - [2, ...] → 'Call'
 * - [3, ...] → 'CallResult'
 * - [4, ...] → 'CallError'
 */
export function classifyMessageType(message: RawOcppMessage): MessageType {
  const typeId = message[0];
  switch (typeId) {
    case 2:
      return 'Call';
    case 3:
      return 'CallResult';
    case 4:
      return 'CallError';
    default:
      // Should not happen — schema validation prevents this
      return 'Call';
  }
}

/**
 * Extract the action name from a Call message.
 * Only Call messages have an action (at index 2).
 */
export function extractAction(message: RawOcppMessage): string | null {
  if (message[0] === 2 && message.length >= 3) {
    const action = message[2];
    return typeof action === 'string' ? action : null;
  }
  return null;
}

/**
 * Extract the payload from any message type.
 * - Call: index 3
 * - CallResult: index 2
 * - CallError: index 4 (ErrorDetails)
 */
export function extractPayload(message: RawOcppMessage): unknown {
  switch (message[0]) {
    case 2:
      return message[3] ?? null;
    case 3:
      return message[2] ?? null;
    case 4:
      return message[4] ?? null;
    default:
      return null;
  }
}

/**
 * Extract error code from a CallError message (index 2).
 */
export function extractErrorCode(message: RawOcppMessage): string | null {
  if (message[0] === 4 && message.length >= 3) {
    const code = message[2];
    return typeof code === 'string' ? code : null;
  }
  return null;
}

/**
 * Extract error description from a CallError message (index 3).
 */
export function extractErrorDescription(message: RawOcppMessage): string | null {
  if (message[0] === 4 && message.length >= 4) {
    const desc = message[3];
    return typeof desc === 'string' ? desc : null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// normalizeEvents()
// ---------------------------------------------------------------------------

/**
 * Normalize an array of raw trace event inputs into canonical `Event` objects.
 *
 * This function:
 * 1. Classifies the message type (Call/CallResult/CallError)
 * 2. Extracts action, payload, error fields
 * 3. Normalizes timestamps to epoch milliseconds
 * 4. Resolves direction: uses explicit direction if provided, otherwise
 *    infers from action name (for Calls) or from the matched Call (for responses)
 * 5. Generates sequential event IDs
 *
 * Events are NOT reordered (ADR-0005). Out-of-order timestamps are preserved
 * as-is; the caller can detect them after normalization.
 *
 * @see ADR-0003, ADR-0004, ADR-0005
 */
export function normalizeEvents(inputs: TraceEventInput[]): Event[] {
  // First pass: create events with best-effort direction
  const events: Event[] = inputs.map((input, index) => {
    const message = input.message;
    const messageType = classifyMessageType(message);
    const action = extractAction(message);

    // Use explicit direction, or infer from action for Call messages.
    // An explicit direction (including 'UNKNOWN') is respected as-is.
    // Only infer when direction is not provided at all (undefined).
    let direction = input.direction;
    if (direction === undefined && messageType === 'Call' && action !== null) {
      direction = inferDirection(messageType, action);
    }
    if (direction === undefined) {
      direction = 'UNKNOWN';
    }

    return {
      id: `evt-${String(index + 1).padStart(4, '0')}`,
      messageId: message[1],
      timestamp: normalizeTimestamp(input.timestamp),
      direction,
      messageType,
      action,
      payload: extractPayload(message),
      errorCode: extractErrorCode(message),
      errorDescription: extractErrorDescription(message),
      rawMessage: message,
    };
  });

  // Second pass: resolve response directions by matching to their original Calls.
  // Build a map of messageId → Call direction.
  const callDirections = new Map<string, Direction>();
  for (const event of events) {
    if (event.messageType === 'Call' && event.direction !== 'UNKNOWN') {
      callDirections.set(event.messageId, event.direction);
    }
  }

  // For CallResult/CallError with UNKNOWN direction, infer from the matched Call
  for (const event of events) {
    if (event.direction === 'UNKNOWN' && event.messageType !== 'Call') {
      const callDir = callDirections.get(event.messageId);
      if (callDir) {
        event.direction = reverseDirection(callDir);
      }
    }
  }

  return events;
}
