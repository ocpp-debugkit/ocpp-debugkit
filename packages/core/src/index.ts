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

// Fixtures
export * from './fixtures/index.js';
