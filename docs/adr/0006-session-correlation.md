# ADR-0006: Session Correlation Strategy

## Status

Accepted

## Context

A trace may contain messages from multiple charging sessions, connectors, or
even stations. To build meaningful timelines and detect failures, the tool
must correlate events into sessions. In OCPP 1.6:

- **Station identity** is the charge point identity. In a WebSocket deployment, this is typically the URL path (e.g., `/ocpp/CS-001`). In a trace, it may appear in `BootNotification` payload (`chargePointSerialNumber`) or trace metadata.
- **Connector identity** is the `connectorId` field in messages (integer, 0 = charge point as a whole, 1+ = individual connectors).
- **Transaction identity** is the `transactionId` assigned by the CSMS in the `StartTransaction` response and referenced in `StopTransaction` and `MeterValues`.
- **Session** is a DebugKit concept — a logical grouping of events for one charging session on one connector.

## Decision

**Sessions are derived by correlating transaction IDs, with connector and station as secondary groupings.**

### Correlation fields

| Field | Source | Used for |
|---|---|---|
| `stationId` | Trace metadata, or `BootNotification` payload `chargePointSerialNumber` | Top-level grouping |
| `connectorId` | Event payload `connectorId` field | Sub-grouping within a station |
| `transactionId` | `StartTransaction` response payload, referenced by `StopTransaction` and `MeterValues` | Primary session key |

### Session derivation algorithm

1. **Extract station ID** from trace metadata. If absent, infer from the first `BootNotification` Call's payload (`chargePointSerialNumber`). If still absent, use `"unknown"`.

2. **Find transaction boundaries:** Scan for `StartTransaction` Call messages. Each `StartTransaction` Call + its `CallResult` (which contains `transactionId`) marks the start of a session.

3. **Match `StopTransaction`:** Find `StopTransaction` calls whose payload contains the matching `transactionId`. This marks the end of the session.

4. **Associate intermediate events:** Events with a `connectorId` and timestamps between start and stop are associated with the session. `MeterValues` and `StatusNotification` events with matching `connectorId` and timestamps within the session window are included.

5. **Handle orphaned events:** Events that cannot be associated with a transaction (e.g., `BootNotification`, `Heartbeat`, `Authorize` without a subsequent `StartTransaction`) are grouped into a "pre-session" or "inter-session" bucket per station.

### Session type

```typescript
interface Session {
  sessionId: string;          // generated: "session-<stationId>-<connectorId>-<seq>"
  stationId: string;
  connectorId: number | null;
  transactionId: number | null;
  startTime: number | null;   // from StartTransaction timestamp
  endTime: number | null;     // from StopTransaction timestamp
  events: Event[];            // all events in this session
  status: 'active' | 'completed' | 'aborted';
}
```

### Multi-station traces

A trace may contain events from multiple stations (e.g., a CSMS log). Sessions are grouped first by `stationId`, then by transaction. The UI presents a station selector when multiple stations are present.

## Consequences

- Sessions are derived, not explicitly declared — the tool reconstructs them from message content.
- Traces without `BootNotification` will have `stationId: "unknown"` unless metadata is provided.
- Traces without `StartTransaction` will not have well-defined sessions — events are grouped into a pre-session bucket.
- `transactionId` is the primary correlation key — traces where it is missing or inconsistent will have degraded session detection.
- The session concept is extensible — future versions can add session-level metrics (duration, energy delivered, etc.).
- This design handles single-station traces (the common case for the Inspector UI) and multi-station traces (CSMS logs) without separate code paths.
