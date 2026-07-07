# ADR-0002: Input Trace Formats — JSON Object + JSONL

## Status

Accepted

## Context

Users capture OCPP traces from different sources: WebSocket proxies, CSMS
logs, network captures, manual reconstruction. These sources produce data in
different shapes. The parser must accept the most common formats without
requiring users to manually transform their data.

Two formats are prevalent:

1. **JSON Object** — a structured file with metadata and an events array. Suitable for curated trace files, scenario fixtures, and saved debug sessions.
2. **JSONL (JSON Lines)** — one event per line. Suitable for streaming captures, log files, and real-time traces from CSMS logs.

Some users may also paste a single OCPP message or a bare JSON array of messages, but these are secondary cases handled as degenerate forms of the above.

## Decision

**`parseTrace()` accepts two formats: JSON Object and JSONL.**

### JSON Object format

```json
{
  "traceId": "string (optional)",
  "metadata": {
    "stationId": "string (optional)",
    "ocppVersion": "1.6",
    "source": "string (optional)"
  },
  "events": [
    {
      "timestamp": "ISO 8601 string (optional)",
      "direction": "CS_TO_CSMS | CSMS_TO_CS",
      "message": [2, "unique-id", "Action", { ...payload }]
    }
  ]
}
```

### JSONL format

Each line is a single event object (same shape as elements in the `events` array above). No top-level metadata wrapper. Station ID and OCPP version are inferred from event content (e.g., `BootNotification` payload) or left unknown.

### Detection strategy

The parser detects format by:
1. Attempting JSON parse of the entire input → if it yields an object with an `events` array, treat as JSON Object format.
2. If full JSON parse fails, split by newlines and parse each non-empty line as JSON → JSONL format.
3. If a single JSON array is provided (bare `[[2, "id", "Action", {}], ...]`), treat each element as a raw OCPP message with unknown direction and timestamp.

### Size limits

- Maximum input size: 10 MB.
- Maximum event count: 10,000 events.
- These limits are enforced before parsing begins.

## Consequences

- Users can paste traces from CSMS logs (JSONL) or load curated files (JSON Object) without transformation.
- JSONL traces lack top-level metadata; station ID and version are inferred from message content where possible.
- The parser has a clear detection strategy with no ambiguity.
- Bare OCPP message arrays (no wrapper) are supported as a convenience but lose direction/timestamp info — the UI will show these as "unknown direction" and "unknown time".
- Size and count limits protect against accidental denial-of-service from very large files.
