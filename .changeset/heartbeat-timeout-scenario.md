---
'@ocpp-debugkit/toolkit': patch
---

Add `heartbeat-timeout` scenario covering the `TIMEOUT_NO_HEARTBEAT` detection rule. The synthetic trace boots a station with `interval=300`, then sends a `StatusNotification` past the 2× interval threshold (`06:12:00.000Z`) with no `Heartbeat` anywhere in the trace.
