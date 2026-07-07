/**
 * Core type definitions for OCPP DebugKit.
 *
 * These are the proposed canonical types from the M0.5 design phase
 * (ADR-0003 through ADR-0006). They will be fully implemented with Zod
 * schemas in v0.1.0 (Issue #13).
 */

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/**
 * Direction of an OCPP message.
 * @see ADR-0004
 */
export type Direction = 'CS_TO_CSMS' | 'CSMS_TO_CS' | 'UNKNOWN';

/**
 * OCPP 1.6 JSON message type.
 * - Call (2): request from one side to the other.
 * - CallResult (3): successful response.
 * - CallError (4): error response.
 */
export type MessageType = 'Call' | 'CallResult' | 'CallError';

// ---------------------------------------------------------------------------
// Event Model (ADR-0003)
// ---------------------------------------------------------------------------

/**
 * A raw OCPP 1.6 JSON message as it appears on the wire.
 * The shape depends on the message type:
 * - Call:        [2, UniqueId, Action, Payload]
 * - CallResult:  [3, UniqueId, Payload]
 * - CallError:   [4, UniqueId, ErrorCode, ErrorDescription, ErrorDetails]
 */
export type RawOcppMessage = [number, string, ...unknown[]];

/**
 * A trace event entry as it appears in a trace file (JSON Object or JSONL).
 * This is the input shape before normalization.
 */
export interface TraceEventInput {
  /** ISO 8601 string or Unix epoch (ms or s). Optional. */
  timestamp?: string | number | null;
  /** Direction of the message. Inferred if absent. */
  direction?: Direction;
  /** Raw OCPP 1.6 JSON message array. */
  message: RawOcppMessage;
}

/**
 * The canonical normalized event used internally by DebugKit.
 * @see ADR-0003
 */
export interface Event {
  /** Generated unique event ID (sequential, stable within a parse). */
  id: string;
  /** OCPP UniqueId from the message array. */
  messageId: string;
  /** Normalized timestamp in epoch milliseconds. null if missing. */
  timestamp: number | null;
  /** Direction of the message. */
  direction: Direction;
  /** OCPP message type. */
  messageType: MessageType;
  /** OCPP action name (e.g., "BootNotification"). Present only for Call messages. */
  action: string | null;
  /** OCPP payload object. */
  payload: unknown;
  /** Error code, present only for CallError messages. */
  errorCode: string | null;
  /** Error description, present only for CallError messages. */
  errorDescription: string | null;
  /** The original raw OCPP message array, unmodified. */
  rawMessage: RawOcppMessage;
}

// ---------------------------------------------------------------------------
// Trace Model (ADR-0002)
// ---------------------------------------------------------------------------

/**
 * Metadata for a trace file.
 */
export interface TraceMetadata {
  stationId?: string;
  ocppVersion?: string;
  source?: string;
  description?: string;
}

/**
 * The JSON Object trace format.
 * @see ADR-0002, docs/trace-format-spec.md
 */
export interface Trace {
  traceId?: string;
  metadata?: TraceMetadata;
  events: TraceEventInput[];
}

// ---------------------------------------------------------------------------
// Session Model (ADR-0006)
// ---------------------------------------------------------------------------

/**
 * A logical charging session derived from trace events.
 * @see ADR-0006
 */
export interface Session {
  sessionId: string;
  stationId: string;
  connectorId: number | null;
  transactionId: number | null;
  startTime: number | null;
  endTime: number | null;
  events: Event[];
  status: 'active' | 'completed' | 'aborted';
}

// ---------------------------------------------------------------------------
// Parse Result (ADR-0007)
// ---------------------------------------------------------------------------

/**
 * A warning produced during parsing when an individual event is malformed.
 * @see ADR-0007
 */
export interface ParseWarning {
  index: number;
  message: string;
  rawInput?: string;
}

/**
 * Result of parsing a trace.
 */
export interface ParseResult {
  events: Event[];
  warnings: ParseWarning[];
}
