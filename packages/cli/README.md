# @ocpp-debugkit/cli

> Command-line interface for OCPP DebugKit — inspect traces, generate reports, run scenarios.

## Installation

```bash
npm install -g @ocpp-debugkit/cli
```

## Commands

### inspect

Parse and analyze an OCPP trace file:

```bash
ocpp-debugkit inspect trace.json
```

Outputs event count, sessions, detected failures, and parse warnings.

### report

Generate a Markdown report:

```bash
# To stdout
ocpp-debugkit report trace.json

# To a file
ocpp-debugkit report trace.json --output report.md

# Specify format
ocpp-debugkit report trace.json --format markdown
```

### scenario list

List all available built-in scenarios:

```bash
ocpp-debugkit scenario list
```

### scenario run

Run a scenario through the analysis engine and compare detected vs expected failures:

```bash
ocpp-debugkit scenario run failed-auth
```

**Note:** `scenario run` runs static fixtures through the local analysis engine only. It is not active endpoint testing, WebSocket simulation, or live station/CSMS testing.

## Accepted Trace Formats

- **JSON Object** — `{ "metadata": {...}, "events": [...] }`
- **JSONL** — one event per line
- **Bare array** — `[[2, "id", "Action", {}], ...]`

## Limits

- Maximum input size: 10 MB
- Maximum event count: 10,000

## License

Apache 2.0
