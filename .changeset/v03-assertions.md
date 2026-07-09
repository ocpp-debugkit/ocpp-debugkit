---
'@ocpp-debugkit/toolkit': minor
---

Add rich scenario assertions — 8 declarative assertion types for scenario evaluation:
- `event_order`, `event_count`, `payload_field`, `timing`, `session_state`,
  `failure_severity`, `no_failures`, `failure_count`

New API: `runAssertions()`, `evaluateScenario()`. Backward compatible —
existing scenarios with only `expectedFailures` work unchanged.
