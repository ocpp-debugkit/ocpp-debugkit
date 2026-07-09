# Examples

Integration examples showing how to use `@ocpp-debugkit/toolkit` in your projects.

## Available Examples

| Directory | Description |
|-----------|-------------|
| [`simple-trace/`](./simple-trace/) | Parse a trace, detect failures, generate a Markdown report |
| [`simple-csms/`](./simple-csms/) | Validate incoming traces (CSMS mock), check for failures |
| [`simulator-output/`](./simulator-output/) | Process JSONL simulator output, generate HTML report |
| [`ci-example/`](./ci-example/) | Use `ocpp-debugkit ci` in GitHub Actions workflows |

## Running

Each example is a standalone project. `cd` into the directory and run:

```bash
npm install
npm start
```

All trace data is fully synthetic — no real station identifiers or personal data.
