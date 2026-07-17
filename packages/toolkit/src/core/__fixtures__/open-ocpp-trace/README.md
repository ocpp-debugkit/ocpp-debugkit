# Vendored Open OCPP Trace fixtures

Conformance fixtures from the Open OCPP Trace specification, vendored here so
DebugKit's parser is checked against them in CI.

- **Source:** [open-ocpp-trace/specification](https://github.com/open-ocpp-trace/specification)
  (`fixtures/`). All data is synthetic.
- Each `<name>/trace.jsonl` is a trace in the shared format. Each
  `<name>/expected.json` is the consumer view a conformant implementation
  derives from it: correlation pairs, effective actions, unanswered calls, and
  orphan responses.
- [`../../openOcppTrace.conformance.test.ts`](../../openOcppTrace.conformance.test.ts)
  asserts that `deriveOpenOcppTraceView()` reproduces every `expected.json` and
  that `parseOpenOcppTrace()` parses every trace.

Do not edit these by hand. Refresh them from the specification when it changes.
