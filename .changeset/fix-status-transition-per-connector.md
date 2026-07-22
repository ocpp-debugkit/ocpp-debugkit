---
'@ocpp-debugkit/toolkit': patch
---

Fix `STATUS_TRANSITION_VIOLATION` false positives (#128). The rule validated connector status transitions against a single previous status shared across all connectors, so on a multi-connector station an interleaved notification from a different connector (for example connector 1 going `Available` while connector 2 goes `Finishing`) was reported as an invalid transition. Status is now tracked per `connectorId` (connectorId 0, the charge point as a whole, forms its own series), and each transition is validated only within one connector's series. Reported by shiv3 from the ocpp-cp-simulator integration.
