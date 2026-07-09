# Simulator Output Example

Demonstrates processing OCPP simulator output in JSONL format: parse a JSONL
trace, detect failures, and generate an HTML report.

## Run

```bash
npm install
npm start
```

## What it does

1. Parses a JSONL trace (one event per line)
2. Detects failures
3. Generates a self-contained HTML report
4. Writes the report to `report.html`
