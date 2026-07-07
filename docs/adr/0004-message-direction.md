# ADR-0004: Message Direction Representation

## Status

Accepted

## Context

OCPP 1.6 JSON is a bidirectional protocol over WebSocket. A charging station
(Charge Point / CS) sends messages to the CSMS, and the CSMS sends messages
back. Understanding which side initiated a message is critical for debugging:

- A `BootNotification` sent CS→CSMS is normal.
- A `BootNotification` response sent CSMS→CS is the reply.
- Direction determines whether a message is a request or a response.

However, many trace capture methods (network proxies, log files) may not
explicitly record direction. The tool must handle both cases.

## Decision

**Direction is an explicit field in the trace entry, with an `UNKNOWN` fallback.**

```typescript
type Direction = 'CS_TO_CSMS' | 'CSMS_TO_CS' | 'UNKNOWN';
```

### Trace entry includes direction

Each event in a trace file (JSON Object or JSONL) includes a `direction` field:
```json
{ "direction": "CS_TO_CSMS", "message": [2, "id", "BootNotification", {}] }
```

### Inference when direction is missing

When `direction` is missing or `"UNKNOWN"`, the normalizer infers direction from message type and action:

1. **Call messages (type 2):** Direction is inferred from the action:
   - CS→CSMS actions: `BootNotification`, `Authorize`, `StartTransaction`, `StopTransaction`, `Heartbeat`, `StatusNotification`, `MeterValues`, `DataTransfer`, `FirmwareStatusNotification`, `DiagnosticsStatusNotification`.
   - CSMS→CS actions: `Reset`, `RemoteStartTransaction`, `RemoteStopTransaction`, `GetConfiguration`, `ChangeConfiguration`, `ChangeAvailability`, `ClearCache`, `UnlockConnector`, `GetLocalListVersion`, `SendLocalList`, `GetDiagnostics`, `UpdateFirmware`, `TriggerMessage`.
   - Bidirectional actions (`DataTransfer`): remains `UNKNOWN` if not specified.

2. **CallResult and CallError messages (types 3 and 4):** Direction is the reverse of the originating Call. The normalizer correlates by `messageId` — if the originating Call's direction is known, the response direction is the opposite.

### When inference is not possible

If direction cannot be inferred (e.g., a CallResult without a matching Call, or a `DataTransfer` Call with no direction), the event retains `UNKNOWN` direction. The UI displays this as "Unknown direction" and the detection rules treat it conservatively (no direction-based failure is triggered on `UNKNOWN`).

## Consequences

- Traces with explicit direction are the gold standard — no inference needed.
- Traces without direction (bare message arrays) still work — the tool infers where possible and marks the rest `UNKNOWN`.
- The inference logic is a static mapping of OCPP 1.6 actions, maintained in the normalizer.
- `UNKNOWN` direction does not cause failures but limits detection accuracy — the UI encourages users to provide direction info.
- Bidirectional actions like `DataTransfer` require explicit direction in the trace.
