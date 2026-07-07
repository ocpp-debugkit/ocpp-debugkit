---
'@ocpp-debugkit/cli': minor
---

Create CLI package with inspect, report, and scenario commands.

- `ocpp-debugkit inspect <file>` — parse + analyze + output summary
- `ocpp-debugkit report <file>` — generate Markdown report (stdout or --output)
- `ocpp-debugkit scenario list` — list all 5 built-in scenarios
- `ocpp-debugkit scenario run <name>` — run scenario through analysis engine,
  compare detected vs expected failures
- Path safety: validated file paths, size limits
- Input validation: safe parsing, non-sensitive error messages
- 17 integration tests (execa-based)
- Converted JSON fixtures to TS modules (fixes Node.js ESM JSON import issue)
