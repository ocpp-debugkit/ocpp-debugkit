# ADR-0008: Browser-Local Processing & Privacy

## Status

Accepted

## Context

OCPP traces may contain sensitive operational data: station identifiers,
transaction IDs, idTag values (RFID card identifiers), meter readings,
firmware versions, and network timing information. When a user loads a trace
into the Inspector web app, they are trusting the tool with this data.

The tool must process traces entirely client-side. No trace data should be
sent to any server. This is both a privacy commitment and a practical design
constraint — the tool has no backend.

## Decision

**All trace processing happens in the browser. No automatic uploading. No server-side parsing. No telemetry on trace content.**

### Processing boundary

- Trace parsing, normalization, timeline building, failure detection, and report generation all run client-side in the browser.
- The Next.js app is statically generated — no API routes process trace data.
- File upload reads the file locally via the File API — the content never leaves the browser.
- Paste input is processed in-memory — no network request is made.
- Report export (Markdown/HTML) is generated client-side and downloaded via a Blob URL.

### Data that does NOT leave the browser

- Raw trace file content.
- Parsed events and normalized data.
- Session timelines and failure analysis.
- Generated reports.
- Any field within a trace (idTag, transactionId, stationId, etc.).

### Data that MAY leave the browser

- Page navigation events (Vercel Analytics — page URL, referrer, country). No trace content.
- Error reports if the user explicitly opts in (future feature, not in v0.1).

### Future anonymize command

The CLI `anonymize` command (planned for v0.3) will strip or hash sensitive fields from a trace:
- `idTag` values → hashed or replaced with sequential identifiers.
- `chargePointSerialNumber` → hashed.
- `meterValue` readings → kept (not sensitive) or optionally rounded.
- IP addresses (if present in trace metadata) → removed.

Anonymization is an explicit user action — the tool never auto-anonymizes user data. The original trace is never modified; anonymization produces a new file.

### Committed artifacts policy

Trace fixtures, sample data, test data, and examples in the repository are **synthetic** — they contain no real station IDs, transaction IDs, idTags, or personal data. This is enforced during development (see security checklist) and is separate from the browser-local processing rule.

## Consequences

- The web app works offline once loaded (no API calls during trace processing).
- No backend infrastructure is needed for the Inspector — only static hosting.
- Users can safely load real production traces into the web app without data leakage.
- Vercel Analytics tracks page views only, never trace content.
- The anonymize command (v0.3) is additive — it gives users a tool to share traces safely, not a filter applied automatically.
- The CLI processes traces locally on the user's machine — same privacy guarantees.
- Error messages never include trace content in logs or telemetry.
