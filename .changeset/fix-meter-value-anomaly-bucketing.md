---
'@ocpp-debugkit/toolkit': patch
---

Fix `METER_VALUE_ANOMALY` false positives (#127). The rule flattened every `sampledValue` across measurand, phase, unit, location and connector into a single series and asserted monotonicity, but only cumulative `Energy.*.Register` measurands are monotonic and non-negative per OCPP 1.6 section 7.28, so any charge point reporting more than one measurand per sample, or any multi-connector station, produced warnings on nearly every `MeterValues` message. Readings are now bucketed by `(connectorId, measurand, phase, unit, location)` and the monotonic and non-negative checks apply only to cumulative energy registers (an absent `measurand` defaults to `Energy.Active.Import.Register`); other measurands are ignored by this rule. Reported by shiv3 from the ocpp-cp-simulator integration.
