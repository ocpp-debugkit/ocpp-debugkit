# @ocpp-debugkit/toolkit

## 0.3.0

### Minor Changes

- 6775642: Add rich scenario assertions — 8 declarative assertion types for scenario evaluation:
  - `event_order`, `event_count`, `payload_field`, `timing`, `session_state`,
    `failure_severity`, `no_failures`, `failure_count`

  New API: `runAssertions()`, `evaluateScenario()`. Backward compatible —
  existing scenarios with only `expectedFailures` work unchanged.

- 1b8cb39: Add three new CLI commands:
  - `ocpp-debugkit ci [dir]` — run all scenarios, exit 0/1 for CI integration, supports `--format json`
  - `ocpp-debugkit anonymize <file>` — strip sensitive fields from trace files
  - `ocpp-debugkit diff <a> <b>` — compare two trace files, supports `--format json`

  Also fixes evaluateScenario to deduplicate failure codes before comparison.

- c580737: Add 5 new failure detection rules for v0.3.0:

  - `SUSPICIOUS_SESSION_DURATION` — sessions shorter than 60s or longer than 24h
  - `SLOW_RESPONSE` — Call→CallResult/CallError gap exceeding 10s
  - `HEARTBEAT_INTERVAL_VIOLATION` — heartbeat intervals deviating >50% from expected
  - `METER_VALUE_ANOMALY` — non-monotonic or negative meter readings
  - `UNRESPONSIVE_CSMS` — Call messages with no matching CallResult or CallError

  Total detection rules: 15 (10 from v0.1/v0.2 + 5 new).

- 8db857e: Add 5 new scenarios using rich assertions (15 total):
  - `slow-csms-response` — SLOW_RESPONSE + timing assertion
  - `meter-anomaly` — METER_VALUE_ANOMALY + payload_field/event_count assertions
  - `short-session` — SUSPICIOUS_SESSION_DURATION + session_state/event_count assertions
  - `heartbeat-irregular` — HEARTBEAT_INTERVAL_VIOLATION + event_count assertion
  - `unresponsive-csms` — UNRESPONSIVE_CSMS + failure_severity/failure_count assertions

  Add `compareScenarioReports()` — compare two scenario evaluation results for regression testing.

- 8f765f9: Add `diffTraces()` — compare two parsed traces and surface event-level differences:
  - Events only in A or B (by messageId)
  - Field-level modifications (timestamp, direction, action, payload, errorCode)
  - Failure differences (detected in A but not B, and vice versa)
  - Summary differences (event count, failure count, duration, status)
