# ADR-0009: Future Protocol-Version Extensibility

## Status

Accepted

## Context

OCPP 1.6 is the primary target for v0.1, but OCPP 2.0.1 is the next
generation and adoption is growing. The tool's internal model must accommodate
2.0.1 without a breaking rewrite, while not over-engineering for a future
that may differ from expectations.

Key differences between 1.6 and 2.0.1:

- 2.0.1 uses a different message structure (still JSON over WebSocket, but with different actions and payload shapes).
- 2.0.1 introduces new message types (e.g., `Request`, `Response`, `EventNotification`).
- 2.0.1 has richer device management (charging station as a group of EVSEs, each with connectors).
- 2.0.1 has variable monitoring and reporting.

## Decision

**The architecture is version-aware, not version-hardcoded. Extensibility is structural, not speculative.**

### Version field in trace format

The trace format includes `metadata.ocppVersion` (default `"1.6"`). The parser checks this field and dispatches to the appropriate version-specific parser. If the version is unsupported, it returns a clear error.

### Version-aware event model

The `Event` type (ADR-0003) is version-agnostic:
- `action` is a string — any OCPP action name from any version.
- `payload` is `unknown` — version-specific schema validation happens separately.
- `messageType` uses generic names (`Call`, `CallResult`, `CallError`) that map to OCPP 1.6's message type IDs. OCPP 2.0.1's message types map into the same three categories.

### Version-specific modules

When OCPP 2.0.1 support is added:

1. A new parser variant (`parseOcpp2Message()`) handles 2.0.1 message shapes.
2. New Zod schemas validate 2.0.1 payloads.
3. New detection rules cover 2.0.1-specific failure patterns.
4. The `Event` type, `Session` type, timeline builder, and reporter remain unchanged.
5. The trace format remains unchanged — only `ocppVersion` differs.

### What is NOT done for 2.0.1 in v0.1

- No 2.0.1 schemas or parsers.
- No 2.0.1 detection rules.
- No 2.0.1 fixtures.
- No abstract "protocol plugin" system — the dispatch is a simple if/switch on version.

### Extensibility principles

1. **Add, don't modify.** New versions add new parsers/schemas/rules. Existing ones are not modified.
2. **No premature abstraction.** No plugin system, no protocol interface, no factory pattern — until there are at least two implementations that prove the abstraction.
3. **Stable core types.** `Event`, `Session`, `Failure`, `TimelineEntry` are the stable core. Version-specific code produces these types.
4. **Version in metadata, not in events.** Each event doesn't carry its OCPP version — the trace's `ocppVersion` applies to all events in that trace.

## Consequences

- Adding OCPP 2.0.1 is an additive change: new parser, new schemas, new rules — no breaking changes to existing code.
- The `Event` type is the stability contract — downstream code (timeline, reporter, UI) doesn't need to know the OCPP version.
- No over-engineering in v0.1 — the dispatch is a simple conditional, not a plugin architecture.
- Users get a clear "unsupported OCPP version" error for 2.0.1 traces in v0.1, not silent misinterpretation.
- The trace format is forward-compatible — a future 2.0.1 trace uses the same structure with `ocppVersion: "2.0.1"`.
