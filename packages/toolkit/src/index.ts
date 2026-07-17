/**
 * @ocpp-debugkit/toolkit — Open-source DevTools for debugging OCPP charging sessions.
 *
 * @module @ocpp-debugkit/toolkit
 *
 * The root barrel re-exports the most commonly used functions from the
 * core module. For full modular consumption, use subpath exports:
 *
 *   import { parseTrace } from '@ocpp-debugkit/toolkit/core';
 *   import { builtInScenarios } from '@ocpp-debugkit/toolkit/scenarios';
 *   import { generateMarkdownReport } from '@ocpp-debugkit/toolkit/reporter';
 *   import { ReplayEngine } from '@ocpp-debugkit/toolkit/replay';
 *   import { SessionTimeline } from '@ocpp-debugkit/toolkit/react';
 */

// Re-export the most commonly used core functions for convenience
export {
  parseTrace,
  ParseError,
  MAX_INPUT_SIZE_BYTES,
  MAX_EVENT_COUNT,
  type TraceFormat,
} from './core/index.js';

// Open OCPP Trace interop
export {
  parseOpenOcppTrace,
  deriveOpenOcppTraceView,
  toOpenOcppTraceRecords,
  toOpenOcppTraceJsonl,
  OPEN_OCPP_TRACE_SCHEMA_VERSION,
  type OpenOcppTraceRecord,
  type OpenOcppTraceView,
  type OpenOcppTraceExportOptions,
  type OpenOcppTraceExportResult,
} from './core/index.js';

export {
  normalizeEvents,
  normalizeTimestamp,
  inferDirection,
  reverseDirection,
  classifyMessageType,
  extractAction,
  extractPayload,
  extractErrorCode,
  extractErrorDescription,
} from './core/index.js';

export { buildSessionTimeline } from './core/index.js';
export { detectFailures } from './core/index.js';
export { summarizeSession, summarizeSessions } from './core/index.js';
export { validateMessage, validateMessages } from './core/index.js';
export { diffTraces } from './core/index.js';
export { runAssertions, evaluateScenario } from './core/index.js';

// Re-export core types and schemas
export type {
  Trace,
  Event,
  Session,
  Failure,
  Scenario,
  SessionSummary,
  ValidationResult,
  RawOcppMessage,
  Direction,
  MessageType,
  FailureSeverity,
  FailureCode,
  TraceEventInput,
  TraceMetadata,
  ParseWarning,
  ParseResult,
  TraceDiff,
  EventDiff,
  SummaryDiff,
  ScenarioAssertion,
  AssertionResult,
  ScenarioEvalResult,
} from './core/index.js';

// Re-export schemas
export {
  directionSchema,
  messageTypeSchema,
  rawOcppMessageSchema,
  traceEventInputSchema,
  traceMetadataSchema,
  traceSchema,
  bareArraySchema,
} from './core/index.js';

// Re-export fixtures
export { fixtures, fixtureNames } from './core/index.js';
