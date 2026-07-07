# ADR-0001: OCPP Version Scope — 1.6 JSON Primary

## Status

Accepted

## Context

OCPP has multiple versions in production use (1.6, 2.0.1) and two transport
encodings (SOAP and JSON). OCPP 1.6 JSON is the most widely deployed variant
in modern EV charging infrastructure — it is the default for nearly all
new charge point and CSMS implementations. OCPP 2.0.1 adoption is growing but
not yet dominant. SOAP is legacy.

The tool must start with a focused scope. Supporting all versions and transports
from day one would dilute quality and delay the first release. However, the
internal model must not preclude adding 2.0.1 later.

## Decision

**v0.1 supports OCPP 1.6 JSON only.**

- The parser understands OCPP 1.6 JSON message format: `[MessageTypeId, UniqueId, Action, Payload]` for Call, `[MessageTypeId, UniqueId, Payload]` for CallResult, `[MessageTypeId, UniqueId, ErrorCode, ErrorDescription, ErrorDetails]` for CallError.
- The event model and trace format are designed to be version-aware (an `ocppVersion` field exists in trace metadata) so that 2.0.1 support can be added without breaking changes.
- SOAP is not supported and is not planned.
- OCPP 2.0.1 is explicitly out of scope for v0.1 but the architecture does not prevent its addition in a future version.

## Consequences

- v0.1 parser, normalizer, and detection rules are built for OCPP 1.6 message shapes only.
- The trace format includes an `ocppVersion` field (default `"1.6"`) so future traces can declare their version.
- The `Event` type's `action` field uses OCPP 1.6 action names (e.g., `BootNotification`, `Authorize`, `StartTransaction`).
- When OCPP 2.0.1 is added, it will require a new parser variant and potentially new detection rules, but the `Event` model and trace format will remain stable.
- Users with OCPP 2.0.1 traces will receive a clear "unsupported version" message, not silent misinterpretation.
