---
'@ocpp-debugkit/core': minor
---

Implement session timeline, failure detection, summarizer, and validator.

- `buildSessionTimeline()` correlates events into sessions by transactionId (ADR-0006)
- `detectFailures()` implements 3 detection rules: FAILED_AUTHORIZATION,
  CONNECTOR_FAULT, STATION_OFFLINE_DURING_SESSION
- `summarizeSession()` / `summarizeSessions()` produce overview statistics
- `validateMessage()` / `validateMessages()` check OCPP 1.6 JSON structural compliance
- 40 new unit tests (10 timeline + 11 detection + 5 summarizer + 14 validator)
