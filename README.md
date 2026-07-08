# OCPP DebugKit

> Open-source DevTools for debugging OCPP charging sessions.

[![CI](https://github.com/ocpp-debugkit/ocpp-debugkit/actions/workflows/ci.yml/badge.svg)](https://github.com/ocpp-debugkit/ocpp-debugkit/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](https://github.com/ocpp-debugkit/ocpp-debugkit/blob/main/LICENSE)
[![npm](https://img.shields.io/badge/npm-%40ocpp--debugkit-blue.svg)](https://www.npmjs.com/org/ocpp-debugkit)

OCPP DebugKit is a developer toolkit for inspecting, analyzing, and debugging
OCPP (Open Charge Point Protocol) charging session traces. It helps EV charging
infrastructure developers diagnose failures, understand session timelines, and
validate behavior against known scenarios.

## Features

- **Trace Inspector** — Load OCPP traces, view session timelines, inspect
  individual messages, and identify failures.
- **Failure Detection** — Automatically detect common session failure patterns
  (failed authorization, connector faults, station offline).
- **Scenario Library** — 5 predefined trace scenarios with expected failure
  outcomes for testing the analysis engine.
- **Report Generation** — Export session analysis as Markdown reports.
- **CLI** — Analyze traces from the command line.
- **Browser-Local** — All trace processing happens in your browser. No data
  leaves your machine when using the web app.

> **Scenario Evaluator & Replay** (comparing detected vs expected failures,
> replay engine, extracted React components) is planned for v0.2.0. See the
> [Roadmap](./ROADMAP.md).

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
      │
      └── apps/web (single Next.js app)
```

| Import path | Description |
|-------------|-------------|
| `@ocpp-debugkit/toolkit/core` | Data model, trace parser, event normalizer, timeline, failure detection |
| `@ocpp-debugkit/toolkit/scenarios` | Predefined trace scenarios for testing |
| `@ocpp-debugkit/toolkit/reporter` | Report generators (Markdown) |
| `@ocpp-debugkit/toolkit/replay` | Replay engine |
| `@ocpp-debugkit/toolkit/react` | Reusable React components |
| `@ocpp-debugkit/toolkit/cli` | Programmatic CLI entry (`bin: ocpp-debugkit`) |
| `@ocpp-debugkit/toolkit/fixtures` | Trace fixtures for testing |
| `apps/web` | Single Next.js app (landing, inspector, docs) |

**Build order:** toolkit (all internal modules in one `tsc` pass) → app

## Quickstart

### From source

```bash
git clone https://github.com/ocpp-debugkit/ocpp-debugkit.git
cd ocpp-debugkit
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

### Web App

Visit [ocppdebugkit.com/inspector](https://ocppdebugkit.com/inspector) to
load a trace directly in your browser — no installation required.

## Links

- [Documentation](https://ocppdebugkit.com/docs)
- [GitHub](https://github.com/ocpp-debugkit/ocpp-debugkit)
- [npm](https://www.npmjs.com/org/ocpp-debugkit)
- [Roadmap](./ROADMAP.md)
- [Contributing](./CONTRIBUTING.md)

## Support the project

This project is free and open source.

If it saves you time, you can contribute any amount to help cover
maintenance, testing, documentation, and infrastructure.

- Support with USDT — BNB Smart Chain (BEP20): `0x5Fd014e5f9d6C2d6d440752e296d0681aA943633`

## License

[Apache License 2.0](./LICENSE)
