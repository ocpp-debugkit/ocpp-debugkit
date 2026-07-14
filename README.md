# OCPP DebugKit

> Open-source DevTools for debugging OCPP charging sessions.

[![CI](https://github.com/ocpp-debugkit/toolkit/actions/workflows/ci.yml/badge.svg)](https://github.com/ocpp-debugkit/toolkit/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](https://github.com/ocpp-debugkit/toolkit/blob/main/LICENSE)
[![npm version](https://img.shields.io/npm/v/@ocpp-debugkit/toolkit.svg)](https://www.npmjs.com/package/@ocpp-debugkit/toolkit)

OCPP DebugKit is a developer toolkit for inspecting, analyzing, and debugging
OCPP (Open Charge Point Protocol) charging session traces. It helps EV charging
infrastructure developers diagnose failures, understand session timelines, and
validate behavior against known scenarios.

## Features

- **Trace Inspector** — Load OCPP traces, view session timelines, inspect
  individual messages, and identify failures.
- **Failure Detection** — 16 detection rules (4 critical, 10 warning, 2 info)
  covering common failure patterns: failed authorization, connector faults,
  station offline, heartbeat timeout, meter value gaps, invalid stop reasons,
  unexpected starts, status transition violations, diagnostics failures,
  firmware update failures, suspicious session duration, slow CSMS responses,
  heartbeat interval violations, meter value anomalies, unresponsive CSMS, and
  repeated boot notifications.
- **Scenario Evaluator** — 15 predefined scenarios with expected failure
  outcomes for testing the analysis engine. Supports external scenario files.
- **Replay Engine** — Deterministic, pure replay engine with step forward/back,
  jump-to-event, and configurable playback speed.
- **Report Generation** — Export session analysis as Markdown or HTML reports.
- **React Components** — Reusable, SSR-safe components for building custom
  inspector UIs (SessionTimeline, MessageInspector, FailureSummary,
  ReportViewer, ReplayControls).
- **CLI** — Analyze traces, generate reports, and run scenarios from the
  command line.
- **Browser-Local** — All trace processing happens in your browser. No data
  leaves your machine when using the web app.

## What It's Not

- Not a CSMS (Charging Station Management System)
- Not a charging station simulator
- Not a compliance certification tool
- Not an active endpoint tester (scenario evaluation is offline/static)

## Architecture

OCPP DebugKit is a pnpm monorepo. All modules ship in a single npm package,
`@ocpp-debugkit/toolkit`, exposed via [subpath exports](https://nodejs.org/api/packages.html#subpath-exports).

```
@ocpp-debugkit/toolkit
├── core        ← data model, parser, normalizer, timeline, failure detection
├── scenarios   ← predefined trace scenarios (depends on core)
├── reporter    ← report generators — Markdown, HTML (depends on core)
├── replay      ← replay engine (depends on core)
├── react       ← reusable React components (depends on core, scenarios, reporter)
└── cli         ← command-line interface (depends on core, scenarios, reporter)
```

| Import path | Description |
|-------------|-------------|
| `@ocpp-debugkit/toolkit/core` | Data model, trace parser, event normalizer, timeline, failure detection |
| `@ocpp-debugkit/toolkit/scenarios` | Predefined trace scenarios for testing |
| `@ocpp-debugkit/toolkit/reporter` | Report generators (Markdown, HTML) |
| `@ocpp-debugkit/toolkit/replay` | Replay engine |
| `@ocpp-debugkit/toolkit/react` | Reusable React components |
| `@ocpp-debugkit/toolkit/cli` | Programmatic CLI entry (`bin: ocpp-debugkit`) |
| `@ocpp-debugkit/toolkit/fixtures` | Trace fixtures for testing |

**Build order:** toolkit — all internal modules build in one `tsc` pass.

> The website (landing, inspector, docs) now lives in its own repo,
> [ocpp-debugkit/website](https://github.com/ocpp-debugkit/website), deployed at
> [ocppdebugkit.com](https://www.ocppdebugkit.com).

## Quickstart

### From source

```bash
git clone https://github.com/ocpp-debugkit/toolkit.git
cd toolkit
pnpm install
pnpm build
```

### CLI

Install the single package globally to get the `ocpp-debugkit` binary:

```bash
npm install -g @ocpp-debugkit/toolkit
ocpp-debugkit inspect trace.json
```

Or use `npx` without installing:

```bash
npx ocpp-debugkit inspect trace.json
```

Other commands:

```bash
ocpp-debugkit report trace.json --output report.md
ocpp-debugkit scenario list
ocpp-debugkit scenario run failed-auth
```

### Programmatic Usage

```ts
import { parseTrace, detectFailures } from '@ocpp-debugkit/toolkit/core';
import { scenarios } from '@ocpp-debugkit/toolkit/scenarios';
import { generateMarkdownReport } from '@ocpp-debugkit/toolkit/reporter';
```

See the [Migration Guide](./docs/migration.md) if you are upgrading from the
old multi-package layout.

### Examples

See the [`examples/`](./examples/) directory for integration examples:
- `simple-trace/` — Parse, detect, and report
- `simple-csms/` — CSMS validation mock
- `simulator-output/` — JSONL processing + HTML report
- `ci-example/` — GitHub Actions CI integration

### Web App

Visit [ocppdebugkit.com/inspector](https://ocppdebugkit.com/inspector) to
load a trace directly in your browser — no installation required.

## Links

- [Documentation](https://ocppdebugkit.com/docs)
- [GitHub](https://github.com/ocpp-debugkit/toolkit)
- [npm](https://www.npmjs.com/package/@ocpp-debugkit/toolkit)
- [Roadmap](./ROADMAP.md)
- [Contributing](./CONTRIBUTING.md)

## Support the project

This project is free and open source.

If it saves you time, you can contribute any amount to help cover
maintenance, testing, documentation, and infrastructure.

- Support with USDT — BNB Smart Chain (BEP20): `0x5Fd014e5f9d6C2d6d440752e296d0681aA943633`

## License

[Apache License 2.0](./LICENSE)
