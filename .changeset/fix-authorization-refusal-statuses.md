---
'@ocpp-debugkit/toolkit': patch
---

Report every refusing `AuthorizationStatus` in `FAILED_AUTHORIZATION`, not just `Invalid` (#156). The OCPP 1.6 enumeration (edition 2, section 7.2) has five values and only `Accepted` permits charging, so `Blocked`, `Expired` and `ConcurrentTx` end a driver's session exactly as `Invalid` does. The rule fired on `Invalid` alone, which meant a blocked or expired token produced a clean report, and silence from a detector reads as "this is not the problem". All four refusals now report under the existing code, with the status named in the description, and the suggested steps mention the `ConcurrentTx` case. Adds a `refused-authorization` scenario covering the three newly reported statuses, bringing the corpus to 18.
