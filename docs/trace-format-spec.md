# OCPP DebugKit — Trace Format Specification

> Version: 1.0 · OCPP 1.6 JSON

This document defines the trace formats accepted by OCPP DebugKit's
`parseTrace()` function. See [ADR-0002](adr/0002-input-trace-formats.md) for
the rationale behind these format choices.

---

## Overview

DebugKit accepts two trace formats:

| Format | Description | Use case |
|--------|-------------|----------|
| **JSON Object** | Structured file with metadata + events array | Curated traces, scenario fixtures, saved sessions |
| **JSONL** | One event per line | CSMS logs, streaming captures, real-time traces |

A third degenerate form — a bare JSON array of raw OCPP messages — is accepted
as a convenience but has limited metadata.

---

## JSON Object Format

```json
{
  "traceId": "trace-001",
  "metadata": {
    "stationId": "CS-SYNTHETIC-001",
    "ocppVersion": "1.6",
    "source": "csms-log"
  },
  "events": [
    {
      "timestamp": "2024-01-15T10:30:00.000Z",
      "direction": "CS_TO_CSMS",
      "message": [2, "msg-001", "BootNotification", {
        "chargePointVendor": "SyntheticVendor",
        "chargePointModel": "SM-100",
        "chargePointSerialNumber": "CS-SYNTHETIC-001",
        "firmwareVersion": "1.0.0"
      }]
    }
  ]
}
```

### Fields

#### Top-level

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `traceId` | string | no | Unique identifier for the trace. Auto-generated if absent. |
| `metadata` | object | no | Trace-level metadata. |
| `events` | array | **yes** | Array of event objects. Must not be empty. |

#### `metadata`

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `stationId` | string | no | `"unknown"` | Charge point identity. |
| `ocppVersion` | string | no | `"1.6"` | OCPP version. Only `"1.6"` supported in v0.1. |
| `source` | string | no | — | Origin of the trace (e.g., `"csms-log"`, `"proxy"`). |

#### Event object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `timestamp` | string \| number | no | ISO 8601 string or Unix epoch (ms or s). `null` if missing. |
| `direction` | string | no | `"CS_TO_CSMS"`, `"CSMS_TO_CS"`, or `"UNKNOWN"`. Inferred if absent (see [ADR-0004](adr/0004-message-direction.md)). |
| `message` | array | **yes** | Raw OCPP 1.6 JSON message array. |

---

## JSONL Format

Each line is a JSON object with the same shape as an event in the `events`
array:

```jsonl
{"timestamp":"2024-01-15T10:30:00.000Z","direction":"CS_TO_CSMS","message":[2,"msg-001","BootNotification",{"chargePointVendor":"SyntheticVendor","chargePointModel":"SM-100","chargePointSerialNumber":"CS-SYNTHETIC-001","firmwareVersion":"1.0.0"}]}
{"timestamp":"2024-01-15T10:30:00.500Z","direction":"CSMS_TO_CS","message":[3,"msg-001",{"currentTime":"2024-01-15T10:30:00.500Z","interval":300,"status":"Accepted"}]}
```

- No top-level metadata wrapper.
- Station ID and OCPP version are inferred from message content (e.g.,
  `BootNotification` payload) or left as defaults.
- Blank lines are ignored.

---

## Bare Array Format (degenerate)

A JSON array of raw OCPP message arrays, with no event wrapper:

```json
[
  [2, "msg-001", "BootNotification", {"chargePointSerialNumber": "CS-001"}],
  [3, "msg-001", {"status": "Accepted"}]
]
```

- Direction is inferred from action name (see [ADR-0004](adr/0004-message-direction.md)).
- Timestamp is `null` for all events.
- This format is a convenience for quick testing — not recommended for
  production use.

---

## Open OCPP Trace Format (interop)

DebugKit also reads the
[Open OCPP Trace format](https://github.com/open-ocpp-trace/specification), a
vendor-neutral interchange format for OCPP traces. This lets traces produced by
other tools (simulators, proxies, CSMS test suites) be inspected and analyzed
here without hand-converting them.

The format is a stream of records, one OCPP-J frame per record, as JSONL or a
JSON array of records:

```jsonl
{"schemaVersion":"1.1","timestamp":"2024-01-15T10:30:00.000Z","ocppVersion":"1.6","transport":"json","chargePointId":"CS-SYNTHETIC-001","direction":"cp-to-csms","messageType":"CALL","messageId":"msg-001","action":"BootNotification","payload":{"chargePointVendor":"SyntheticVendor","chargePointModel":"SM-100"},"raw":"[2,\"msg-001\",\"BootNotification\",{\"chargePointVendor\":\"SyntheticVendor\",\"chargePointModel\":\"SM-100\"}]"}
{"schemaVersion":"1.1","timestamp":"2024-01-15T10:30:00.500Z","transport":"json","direction":"csms-to-cp","messageType":"CALLRESULT","messageId":"msg-001","payload":{"status":"Accepted"},"raw":"[3,\"msg-001\",{\"status\":\"Accepted\"}]"}
```

`parseTrace()` detects this format automatically; `parseOpenOcppTrace()` parses
it directly. How records are consumed:

- `direction` maps to the internal directions: `cp-to-csms` becomes
  `CS_TO_CSMS`, `csms-to-cp` becomes `CSMS_TO_CS`.
- `raw`, when present, is the authoritative frame. If it disagrees with the
  decomposed fields, the frame from `raw` wins and a warning is recorded.
- A response (`CALLRESULT` / `CALLERROR`) may omit `action`; its effective
  action is derived by correlating on `messageId`. `deriveOpenOcppTraceView()`
  reports that correlation as the format's consumer view.
- Unknown fields are ignored, so a trace from a later minor version of the
  format still parses. The same size and event-count [limits](#limits) apply.

The format is governed independently at
[open-ocpp-trace/specification](https://github.com/open-ocpp-trace/specification),
which ships a conformance suite that DebugKit's parser is checked against.

---

## OCPP 1.6 JSON Message Structure

OCPP 1.6 JSON uses WebSocket text frames containing JSON arrays. There are
three message types:

### Call (MessageTypeId = 2)

A request from one side to the other.

```
[2, UniqueId, Action, Payload]
```

| Index | Field | Type | Description |
|-------|-------|------|-------------|
| 0 | MessageTypeId | `2` | Always 2 for Call. |
| 1 | UniqueId | string | Unique message identifier. |
| 2 | Action | string | OCPP action name (e.g., `"BootNotification"`). |
| 3 | Payload | object | Request payload. |

### CallResult (MessageTypeId = 3)

A successful response to a Call.

```
[3, UniqueId, Payload]
```

| Index | Field | Type | Description |
|-------|-------|------|-------------|
| 0 | MessageTypeId | `3` | Always 3 for CallResult. |
| 1 | UniqueId | string | Matches the Call's UniqueId. |
| 2 | Payload | object | Response payload. |

### CallError (MessageTypeId = 4)

An error response to a Call.

```
[4, UniqueId, ErrorCode, ErrorDescription, ErrorDetails]
```

| Index | Field | Type | Description |
|-------|-------|------|-------------|
| 0 | MessageTypeId | `4` | Always 4 for CallError. |
| 1 | UniqueId | string | Matches the Call's UniqueId. |
| 2 | ErrorCode | string | OCPP error code (e.g., `"InternalError"`). |
| 3 | ErrorDescription | string | Human-readable error description. |
| 4 | ErrorDetails | any | Additional error details (may be empty object). |

---

## Limits

| Limit | Value | Enforced |
|-------|-------|----------|
| Maximum input size | 10 MB | Before parsing |
| Maximum event count | 10,000 | After parsing |
| Maximum JSON nesting depth | 100 | During parsing |

Inputs exceeding these limits produce a hard error. See
[ADR-0007](adr/0007-malformed-trace-handling.md).

---

## Timestamp Formats

The `timestamp` field accepts:

| Format | Example | Handling |
|--------|---------|----------|
| ISO 8601 (UTC) | `"2024-01-15T10:30:00.000Z"` | Parsed via `Date.parse()` |
| ISO 8601 (offset) | `"2024-01-15T10:30:00+02:00"` | Parsed, normalized to UTC |
| Unix epoch (ms) | `1705312200000` | Used directly |
| Unix epoch (s) | `1705312200` | Detected (value < 10¹²), × 1000 |
| Missing / null | — | Event timestamp is `null` |

See [ADR-0005](adr/0005-timestamp-normalization.md) for ordering and
out-of-order handling.

---

## Direction Values

| Value | Meaning |
|-------|---------|
| `"CS_TO_CSMS"` | Charge Point → CSMS (request from station) |
| `"CSMS_TO_CS"` | CSMS → Charge Point (response or remote trigger) |
| `"UNKNOWN"` | Direction not specified and not inferable |

Direction inference rules are defined in
[ADR-0004](adr/0004-message-direction.md).

---

## Synthetic Data Policy

All trace fixtures, sample data, and examples committed to this repository
**must be synthetic**. No real station identifiers, transaction IDs, idTag
values, or personal data may appear in committed artifacts.

User-loaded traces and runtime-generated reports are **not** subject to this
restriction — they contain the user's own data and are processed locally. See
[ADR-0008](adr/0008-browser-local-processing.md).

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-01-15 | Initial specification for v0.1 (OCPP 1.6 JSON). |
