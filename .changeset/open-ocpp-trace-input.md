---
'@ocpp-debugkit/toolkit': minor
---

Read the Open OCPP Trace interchange format. `parseTrace()` auto-detects it and `parseOpenOcppTrace()` parses it directly, mapping records onto the internal event model with raw-frame precedence, messageId-based action derivation, and unknown-field tolerance. `deriveOpenOcppTraceView()` exposes the format's consumer view, checked in CI against the specification's 15 conformance fixtures.
