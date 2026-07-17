/**
 * Shared untrusted-input limits and the parse error type.
 *
 * Every entry point that ingests untrusted trace input (the internal formats
 * in `parser.ts`, the Open OCPP Trace format in `openOcppTrace.ts`) applies
 * these same limits, so no input path can bypass them.
 *
 * @see ADR-0007 (malformed trace handling)
 * @see docs/trace-format-spec.md
 */

/** Maximum input size in bytes (10 MB). */
export const MAX_INPUT_SIZE_BYTES = 10 * 1024 * 1024;

/** Maximum number of events after parsing. */
export const MAX_EVENT_COUNT = 10_000;

/** Error thrown when input exceeds size limits or has structural problems. */
export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParseError';
  }
}

/**
 * Validate the input size before any parsing.
 * @throws {ParseError} if the input exceeds the maximum size.
 */
export function validateInputSize(input: string): void {
  const byteLength = Buffer.byteLength(input, 'utf8');
  if (byteLength > MAX_INPUT_SIZE_BYTES) {
    throw new ParseError(
      `Input size (${byteLength} bytes) exceeds the maximum allowed size ` +
        `(${MAX_INPUT_SIZE_BYTES} bytes).`,
    );
  }
}

/**
 * Validate the event count after parsing.
 * @throws {ParseError} if the event count exceeds the maximum.
 */
export function validateEventCount(count: number): void {
  if (count > MAX_EVENT_COUNT) {
    throw new ParseError(
      `Event count (${count}) exceeds the maximum allowed count ` + `(${MAX_EVENT_COUNT}).`,
    );
  }
}
