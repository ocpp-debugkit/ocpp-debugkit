# @ocpp-debugkit/toolkit

## 0.4.2

### Patch Changes

- 713dbfc: Fix `STATUS_TRANSITION_VIOLATION` false positives (#128). The rule validated connector status transitions against a single previous status shared across all connectors, so on a multi-connector station an interleaved notification from a different connector (for example connector 1 going `Available` while connector 2 goes `Finishing`) was reported as an invalid transition. Status is now tracked per `connectorId` (connectorId 0, the charge point as a whole, forms its own series), and each transition is validated only within one connector's series. Reported by shiv3 from the ocpp-cp-simulator integration.

## 0.4.1

### Patch Changes

- e1c65e5: Fix `METER_VALUE_ANOMALY` false positives (#127). The rule flattened every `sampledValue` across measurand, phase, unit, location and connector into a single series and asserted monotonicity, but only cumulative `Energy.*.Register` measurands are monotonic and non-negative per OCPP 1.6 section 7.28, so any charge point reporting more than one measurand per sample, or any multi-connector station, produced warnings on nearly every `MeterValues` message. Readings are now bucketed by `(connectorId, measurand, phase, unit, location)` and the monotonic and non-negative checks apply only to cumulative energy registers (an absent `measurand` defaults to `Energy.Active.Import.Register`); other measurands are ignored by this rule. Reported by shiv3 from the ocpp-cp-simulator integration.

## 0.4.0

### Minor Changes

- 0115e85: Write the Open OCPP Trace interchange format. `toOpenOcppTraceRecords()` / `toOpenOcppTraceJsonl()` export any parsed trace as v1.1 records, with `raw` serialized from the stored frame, response `action` back-filled by messageId correlation, and skip-and-flag warnings for events the format cannot represent. A new `ocpp-debugkit convert <file>` CLI command emits the JSONL, carrying trace-level metadata over from JSON Object inputs. Every exported record is validated against the specification's published JSON Schema in CI, and round-trip tests prove export-then-reparse preserves the consumer view and the events.
- 32e48f0: Read the Open OCPP Trace interchange format. `parseTrace()` auto-detects it and `parseOpenOcppTrace()` parses it directly, mapping records onto the internal event model with raw-frame precedence, messageId-based action derivation, and unknown-field tolerance. `deriveOpenOcppTraceView()` exposes the format's consumer view, checked in CI against the specification's 15 conformance fixtures.

## 0.3.2

### Patch Changes

- a6b7d12: Correct the package README, which advertised 10 detection rules and 10 predefined scenarios. The toolkit ships 16 detection rules (4 critical, 10 warning, 2 info) and 15 scenarios.

## 0.3.1

### Patch Changes

- 2c4d518: Add repeated BootNotification failure detection for stations that send multiple boot calls within five minutes.

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
