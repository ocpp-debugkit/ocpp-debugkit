---
'@ocpp-debugkit/toolkit': patch
---

Transcribe the `STATUS_TRANSITION_VIOLATION` matrix from the OCPP 1.6 status transition table (#155, edition 2 section 4.9). The matrix disagreed with the table in both directions: it flagged 22 transitions the table permits and permitted 2 it does not list. The false positives were concentrated in the recovery rows, where the table allows a connector to return from `Faulted` to any pre-fault state and from `Unavailable` straight into an operative state, so any station that faulted mid-session and resumed charging, or that took a scheduled availability change during a session (`Charging -> Unavailable` and its siblings), produced a spurious warning. `Preparing -> Unavailable` and `Finishing -> Reserved` are absent from the table and are now flagged. The rule's matrix is now the table cell by cell, with the spec's own cell labels alongside it, and a test transcribes the table independently so the two have to agree.
