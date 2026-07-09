---
'@ocpp-debugkit/toolkit': minor
---

Add `diffTraces()` — compare two parsed traces and surface event-level differences:
- Events only in A or B (by messageId)
- Field-level modifications (timestamp, direction, action, payload, errorCode)
- Failure differences (detected in A but not B, and vice versa)
- Summary differences (event count, failure count, duration, status)
