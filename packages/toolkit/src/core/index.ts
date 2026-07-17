/**
 * Barrel export for the @ocpp-debugkit/core package.
 */

// Types
export * from './types.js';

// Schemas (Zod)
export * from './schemas.js';

// Parser
export { parseTrace, ParseError, MAX_INPUT_SIZE_BYTES, MAX_EVENT_COUNT } from './parser.js';
export type { TraceFormat } from './parser.js';

// Open OCPP Trace interop (https://github.com/open-ocpp-trace/specification)
export {
  parseOpenOcppTrace,
  deriveOpenOcppTraceView,
  looksLikeOpenOcppTrace,
  OPEN_OCPP_TRACE_SCHEMA_VERSION,
} from './openOcppTrace.js';
export type {
  OpenOcppTraceRecord,
  OpenOcppTraceView,
  OpenOcppTraceViewRecord,
  OpenOcppTraceDirection,
  OpenOcppTraceMessageType,
} from './openOcppTrace.js';

// Normalizer
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
} from './normalizer.js';

// Timeline
export { buildSessionTimeline } from './timeline.js';

// Detection
export { detectFailures } from './detection.js';

// Summarizer
export { summarizeSession, summarizeSessions } from './summarizer.js';

// Validator
export { validateMessage, validateMessages } from './validator.js';

// Diff
export { diffTraces } from './diff.js';
export type { TraceDiff, EventDiff, SummaryDiff } from './diff.js';

// Assertions
export { runAssertion, runAssertions, evaluateScenario } from './assertions.js';
export type { AssertionContext } from './assertions.js';

// Fixtures
export * from './fixtures/index.js';
