# ADR-0003: Canonical Internal Event Model

## Status

Accepted

## Context

OCPP 1.6 JSON messages arrive as bare arrays: `[2, "id", "Action", {payload}]`.
To build timelines, detect failures, and generate reports, the tool needs a
normalized internal representation that:

- Captures all information from the raw message.
- Adds derived metadata (direction, timestamp, message type).
- Is easy to query, filter, and correlate.
- Remains stable as new OCPP versions are supported.

## Decision

**The canonical internal `Event` type is:**

```typescript
interface Event {
  /** Generated unique event ID (sequential, stable within a parse). */
  id: string;
  /** OCPP UniqueId from the message array. */
  messageId: string;
  /** Normalized timestamp in epoch milliseconds. null if missing. */
  timestamp: number | null;
  /** Direction of the message. */
  direction: Direction;
  /** OCPP message type. */
  messageType: MessageType;
  /** OCPP action name (e.g., "BootNotification"). Present only for Call messages. */
  action: string | null;
  /** OCPP payload object. */
  payload: unknown;
  /** Error code, present only for CallError messages. */
  errorCode: string | null;
  /** Error description, present only for CallError messages. */
  errorDescription: string | null;
  /** The original raw OCPP message array, unmodified. */
  rawMessage: unknown;
}

type Direction = 'CS_TO_CSMS' | 'CSMS_TO_CS' | 'UNKNOWN';

type MessageType = 'Call' | 'CallResult' | 'CallError';
```

### Mapping from raw OCPP message

| OCPP array shape | messageType | action | payload | errorCode |
|---|---|---|---|---|
| `[2, id, action, payload]` | `Call` | `action` | `payload` | `null` |
| `[3, id, payload]` | `CallResult` | `null` | `payload` | `null` |
| `[4, id, errorCode, errorDesc, errorDetails]` | `CallError` | `null` | `errorDetails` | `errorCode` |

### Event ID generation

Event IDs are generated as `evt-<zero-padded-index>` (e.g., `evt-0001`,
`evt-0002`) based on the event's position in the trace. This is stable across
parses of the same trace file and human-readable in debug output.

## Consequences

- Every event has a consistent shape regardless of OCPP message type.
- The `rawMessage` field preserves the original data for the message inspector UI.
- `action` is `null` for CallResult/CallError — the action must be correlated via `messageId` to the originating Call.
- `timestamp` is `null` when the trace entry doesn't include one — the timeline builder handles this (see ADR-0005).
- `payload` is `unknown` at this layer — Zod schema validation happens in `validateMessage()` (v0.1), not in the normalizer.
- The `Event` type is the foundation for `Session`, `TimelineEntry`, and `Failure` types in v0.1.
