---
'@ocpp-debugkit/scenarios': minor
---

Create scenarios package with 5 initial scenarios.

- Scenario registry with `getScenario()` lookup
- 5 scenarios: normal-session, failed-auth, connector-fault,
  station-offline, unexpected-stop-reason
- Each scenario's expectedFailures aligns with v0.1 detection rules
- 21 tests (registry, engine integration, synthetic data policy)
