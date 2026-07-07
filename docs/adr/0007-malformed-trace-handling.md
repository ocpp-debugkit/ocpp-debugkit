# ADR-0007: Malformed Trace Handling

## Status

Accepted

## Context

Trace files are untrusted input. They may contain:

- Invalid JSON (syntax errors).
- Valid JSON that doesn't conform to the expected shape.
- OCPP messages with missing fields (e.g., a Call with only 3 elements instead of 4).
- Truncated messages.
- Unknown OCPP actions.
- Payloads that don't match the OCPP 1.6 schema.
- Extremely large inputs (intentional or accidental).
- Deeply nested JSON (parser bomb).

The tool must handle these gracefully — never crash, never execute untrusted code, and always provide a clear error message to the user.

## Decision

**Three-tier error strategy: skip-and-flag for individual events, fail-fast for structural errors, hard limits for size and count.**

### Tier 1: Structural errors (fail-fast)

These cause the entire parse to fail with a clear error message:

- Input is not valid JSON at all (neither JSON Object nor JSONL).
- JSON Object format but no `events` array.
- Input exceeds size limit (10 MB).
- Event count exceeds limit (10,000).
- JSON nesting depth exceeds limit (100 levels).

Error message format: `"Failed to parse trace: <reason>"` — no internal file paths or stack traces exposed.

### Tier 2: Event-level errors (skip-and-flag)

Individual events that are malformed are skipped and collected as warnings:

- Event is not an object.
- Event's `message` field is not an array.
- Message array has fewer than 3 elements.
- MessageTypeId is not 2, 3, or 4.
- Message array structure doesn't match its MessageTypeId (e.g., Call with 3 elements).
- Timestamp is present but unparseable (event still loaded with `null` timestamp).
- Direction is present but not a valid value (set to `UNKNOWN`).

Each skipped event produces a warning object:
```typescript
interface ParseWarning {
  index: number;       // position in the trace
  message: string;     // human-readable description
  rawInput?: string;   // truncated raw input (first 200 chars)
}
```

The parser returns `{ events: Event[], warnings: ParseWarning[] }`. The UI displays warnings in a non-blocking banner.

### Tier 3: Content validation (skip-and-flag, separate pass)

After normalization, `validateMessage()` checks payloads against OCPP 1.6 schemas:

- Unknown action names — flagged but not skipped (the action may be from a future OCPP version or a vendor extension).
- Payload shape mismatches — flagged with details (missing required fields, wrong types).
- These are collected as validation warnings, separate from parse warnings.

### Input sanitization

- All JSON parsing uses `JSON.parse()` in a try/catch — no `eval()`, no `Function()`.
- No prototype pollution: parsed objects are treated as plain data. The normalizer constructs fresh `Event` objects, never mutating the parsed input.
- Payloads are stored as `unknown` and only accessed via validated paths in downstream functions.
- Regex patterns used in validation are checked for ReDoS vulnerability (no catastrophic backtracking).

## Consequences

- The parser never crashes on malformed input — it either fails fast with a clear message or skips individual events with warnings.
- Users see exactly which events were skipped and why, without losing the entire trace.
- Size and count limits protect against accidental or malicious oversized input.
- The two-pass approach (parse → validate) separates structural correctness from OCPP schema compliance.
- `parseTrace()` returns a result object, not just an array — callers must check `warnings`.
- The UI can show a "3 events skipped" banner with expandable details.
