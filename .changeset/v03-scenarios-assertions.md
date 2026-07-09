---
'@ocpp-debugkit/toolkit': minor
---

Add 5 new scenarios using rich assertions (15 total):
- `slow-csms-response` — SLOW_RESPONSE + timing assertion
- `meter-anomaly` — METER_VALUE_ANOMALY + payload_field/event_count assertions
- `short-session` — SUSPICIOUS_SESSION_DURATION + session_state/event_count assertions
- `heartbeat-irregular` — HEARTBEAT_INTERVAL_VIOLATION + event_count assertion
- `unresponsive-csms` — UNRESPONSIVE_CSMS + failure_severity/failure_count assertions

Add `compareScenarioReports()` — compare two scenario evaluation results for regression testing.
