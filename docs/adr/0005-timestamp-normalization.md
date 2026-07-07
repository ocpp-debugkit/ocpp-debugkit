# ADR-0005: Timestamp Normalization

## Status

Accepted

## Context

OCPP 1.6 messages do not inherently carry timestamps — the protocol messages
themselves are stateless JSON. Timestamps come from the trace capture layer
(CSMS logs, WebSocket proxy, network capture). This means:

- Some trace entries have ISO 8601 timestamps.
- Some have Unix epoch timestamps.
- Some have no timestamp at all.
- Timestamps may be out of order (log buffering, clock skew).
- Some messages (CallResult/CallError) may share a timestamp with their Call.

The timeline builder needs a consistent, ordered view of events. How the tool
handles missing, malformed, and out-of-order timestamps directly affects the
accuracy of failure detection (e.g., "station offline during session" depends
on time gaps).

## Decision

**Timestamps are normalized to epoch milliseconds (number). Missing or unparseable timestamps are `null`.**

### Accepted input formats

1. **ISO 8601 string** — e.g., `"2024-01-15T10:30:00.000Z"`, `"2024-01-15T10:30:00+02:00"`. Parsed via `Date.parse()`.
2. **Unix epoch number** — e.g., `1705312200000` (milliseconds) or `1705312200` (seconds, detected when value < 10¹²).
3. **Missing** — the `timestamp` field is absent, `null`, or empty string → event timestamp is `null`.

### Timeline ordering

1. Events with valid timestamps are sorted chronologically (ascending).
2. Events with `null` timestamps are placed at their original position in the trace (preserving capture order) and flagged in the timeline with a "missing timestamp" indicator.
3. If a CallResult/CallError has `null` timestamp but its matching Call has a timestamp, the response inherits the Call's timestamp for ordering purposes (with a note that it was inferred).

### Out-of-order timestamps

Out-of-order events are **not silently reordered**. The timeline preserves the original trace order but flags out-of-order timestamps. The detection engine can then account for both the trace order and the chronological order. The UI shows both the trace position and the timestamp, highlighting inversions.

### Clock skew

Clock skew between CS and CSMS is not corrected in v0.1. Events are ordered by their raw timestamp value. A future version may add NTP-based correction or relative-time normalization.

## Consequences

- `Event.timestamp` is `number | null` — always epoch milliseconds or `null`.
- The timeline builder handles `null` timestamps gracefully without dropping events.
- Out-of-order detection is a first-class concern — the timeline flags it.
- CallResult timestamps can be inferred from their Call for ordering — this is documented, not silent.
- No clock skew correction in v0.1 — a known limitation documented in the trace format spec.
- Detection rules that depend on time gaps (e.g., "station offline") use the normalized timestamps and must handle `null` gracefully.
