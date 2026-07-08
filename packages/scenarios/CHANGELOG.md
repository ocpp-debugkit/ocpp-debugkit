# @ocpp-debugkit/scenarios

## 0.1.0

### Minor Changes

- 17c2aa0: Create scenarios package with 5 initial scenarios.

  - Scenario registry with `getScenario()` lookup
  - 5 scenarios: normal-session, failed-auth, connector-fault,
    station-offline, unexpected-stop-reason
  - Each scenario's expectedFailures aligns with v0.1 detection rules
  - 21 tests (registry, engine integration, synthetic data policy)

### Patch Changes

- Updated dependencies [07bca8c]
- Updated dependencies [9543d50]
- Updated dependencies [f2cef5d]
  - @ocpp-debugkit/core@0.1.0
