---
'@ocpp-debugkit/toolkit': minor
---

Write the Open OCPP Trace interchange format. `toOpenOcppTraceRecords()` / `toOpenOcppTraceJsonl()` export any parsed trace as v1.1 records, with `raw` serialized from the stored frame, response `action` back-filled by messageId correlation, and skip-and-flag warnings for events the format cannot represent. A new `ocpp-debugkit convert <file>` CLI command emits the JSONL, carrying trace-level metadata over from JSON Object inputs. Every exported record is validated against the specification's published JSON Schema in CI, and round-trip tests prove export-then-reparse preserves the consumer view and the events.
