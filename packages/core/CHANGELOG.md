# @ocpp-debugkit/core

## 0.1.1

### Patch Changes

- 38618c7: Add package READMEs for npm discoverability.

## 0.1.0

### Minor Changes

- 07bca8c: Finalize core package for npm publishing.

  - Add `sideEffects: false` for tree-shaking
  - Add `files` field to limit published content
  - Add `keywords`, `repository`, `homepage`, `bugs` fields for npm discoverability
  - Verify barrel export is complete (types, schemas, parser, normalizer, timeline, detection, summarizer, validator, fixtures)

- 9543d50: Implement trace parser, event normalizer, and Zod schemas.

  - `parseTrace()` accepts JSON Object, JSONL, and bare array trace formats
  - `normalizeEvents()` classifies message types, infers directions (ADR-0004),
    and normalizes timestamps to epoch milliseconds (ADR-0005)
  - Zod schemas validate all untrusted input, preventing prototype pollution
  - Input size limit (10 MB) and event count limit (10,000) enforced
  - Malformed individual events are skipped with `ParseWarning` (ADR-0007)
  - Added `Failure`, `Scenario`, `SessionSummary`, `ValidationResult` types
  - 78 new unit tests (46 normalizer + 32 parser)

- f2cef5d: Implement session timeline, failure detection, summarizer, and validator.

  - `buildSessionTimeline()` correlates events into sessions by transactionId (ADR-0006)
  - `detectFailures()` implements 3 detection rules: FAILED_AUTHORIZATION,
    CONNECTOR_FAULT, STATION_OFFLINE_DURING_SESSION
  - `summarizeSession()` / `summarizeSessions()` produce overview statistics
  - `validateMessage()` / `validateMessages()` check OCPP 1.6 JSON structural compliance
  - 40 new unit tests (10 timeline + 11 detection + 5 summarizer + 14 validator)
