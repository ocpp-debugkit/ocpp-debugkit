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

// ---------------------------------------------------------------------------
// Failure Detection (ADR-0003)
// ---------------------------------------------------------------------------

/** Severity of a detected failure. */
export type FailureSeverity = 'critical' | 'warning' | 'info';

/** Failure rule codes. v0.1 codes + v0.2 + v0.3 additions. */
export type FailureCode =
  | 'FAILED_AUTHORIZATION'
  | 'CONNECTOR_FAULT'
  | 'STATION_OFFLINE_DURING_SESSION'
  // v0.2 rules
  | 'TIMEOUT_NO_HEARTBEAT'
  | 'METER_VALUE_GAP'
  | 'INVALID_STOP_REASON'
  | 'UNEXPECTED_START'
  | 'STATUS_TRANSITION_VIOLATION'
  | 'DIAGNOSTICS_FAILURE'
  | 'FIRMWARE_UPDATE_FAILURE'
  // v0.3 rules
  | 'SUSPICIOUS_SESSION_DURATION'
  | 'SLOW_RESPONSE'
  | 'HEARTBEAT_INTERVAL_VIOLATION'
  | 'METER_VALUE_ANOMALY'
  | 'UNRESPONSIVE_CSMS';

/**
 * A detected failure in a trace.
 */
export interface Failure {
  /** Failure rule code. */
  code: FailureCode;
  /** Human-readable description. */
  description: string;
  /** Severity level. */
  severity: FailureSeverity;
  /** Event IDs associated with the failure. */
  eventIds: string[];
  /** Suggested next steps for resolution. */
  suggestedSteps: string[];
}

// ---------------------------------------------------------------------------
// Session Summary
// ---------------------------------------------------------------------------

/** Summary statistics for a charging session. */
export interface SessionSummary {
  sessionId: string;
  stationId: string;
  connectorId: number | null;
  transactionId: number | null;
  status: 'active' | 'completed' | 'aborted';
  eventCount: number;
  durationMs: number | null;
  failureCount: number;
  /** Ordered list of actions in the session. */
  actionSequence: string[];
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** Result of validating a single OCPP message. */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ---------------------------------------------------------------------------
// Scenario
// ---------------------------------------------------------------------------

/** A scenario fixture for testing the analysis engine. */
export interface Scenario {
  name: string;
  description: string;
  /** The trace data to analyze. */
  trace: Trace;
  /** Failure codes expected to be detected. */
  expectedFailures: FailureCode[];
  /** Optional rich assertions (v0.3). When present, evaluated alongside expectedFailures. */
  assertions?: ScenarioAssertion[];
}

// ---------------------------------------------------------------------------
// Scenario Assertions (v0.3)
// ---------------------------------------------------------------------------

/** A declarative assertion for scenario evaluation. */
export type ScenarioAssertion =
  | { type: 'event_order'; params: { actions: string[] } }
  | { type: 'event_count'; params: { min?: number; max?: number; action?: string } }
  | {
      type: 'payload_field';
      params: { action: string; field: string; equals?: unknown; contains?: unknown };
    }
  | {
      type: 'timing';
      params: { actionA: string; actionB: string; maxGapMs?: number; minGapMs?: number };
    }
  | { type: 'session_state'; params: { expected: 'active' | 'completed' | 'aborted' } }
  | { type: 'failure_severity'; params: { code: FailureCode; severity: FailureSeverity } }
  | { type: 'no_failures'; params: Record<string, never> }
  | { type: 'failure_count'; params: { min?: number; max?: number; code?: FailureCode } };

/** Result of evaluating a single assertion. */
export interface AssertionResult {
  /** The assertion that was evaluated. */
  assertion: ScenarioAssertion;
  /** Whether the assertion passed. */
  passed: boolean;
  /** Human-readable description of the result. */
  message: string;
}

/** Result of evaluating all assertions for a scenario. */
export interface ScenarioEvalResult {
  /** Results for each assertion. */
  assertions: AssertionResult[];
  /** Whether all assertions passed. */
  allPassed: boolean;
  /** Detected failures. */
  failures: Failure[];
  /** Detected failure codes. */
  detectedFailureCodes: FailureCode[];
  /** Whether expectedFailures matches detectedFailures. */
  expectedFailuresPassed: boolean;
}
