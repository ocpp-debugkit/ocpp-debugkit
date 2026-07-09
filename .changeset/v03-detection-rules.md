---
'@ocpp-debugkit/toolkit': minor
---

Add 5 new failure detection rules for v0.3.0:

- `SUSPICIOUS_SESSION_DURATION` — sessions shorter than 60s or longer than 24h
- `SLOW_RESPONSE` — Call→CallResult/CallError gap exceeding 10s
- `HEARTBEAT_INTERVAL_VIOLATION` — heartbeat intervals deviating >50% from expected
- `METER_VALUE_ANOMALY` — non-monotonic or negative meter readings
- `UNRESPONSIVE_CSMS` — Call messages with no matching CallResult or CallError

Total detection rules: 15 (10 from v0.1/v0.2 + 5 new).
