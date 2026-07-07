---
'@ocpp-debugkit/core': minor
---

Implement trace parser, event normalizer, and Zod schemas.

- `parseTrace()` accepts JSON Object, JSONL, and bare array trace formats
- `normalizeEvents()` classifies message types, infers directions (ADR-0004),
  and normalizes timestamps to epoch milliseconds (ADR-0005)
- Zod schemas validate all untrusted input, preventing prototype pollution
- Input size limit (10 MB) and event count limit (10,000) enforced
- Malformed individual events are skipped with `ParseWarning` (ADR-0007)
- Added `Failure`, `Scenario`, `SessionSummary`, `ValidationResult` types
- 78 new unit tests (46 normalizer + 32 parser)
