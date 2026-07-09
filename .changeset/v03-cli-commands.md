---
'@ocpp-debugkit/toolkit': minor
---

Add three new CLI commands:
- `ocpp-debugkit ci [dir]` — run all scenarios, exit 0/1 for CI integration, supports `--format json`
- `ocpp-debugkit anonymize <file>` — strip sensitive fields from trace files
- `ocpp-debugkit diff <a> <b>` — compare two trace files, supports `--format json`

Also fixes evaluateScenario to deduplicate failure codes before comparison.
