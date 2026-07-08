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

OCPP DebugKit is a pnpm monorepo with independently versioned packages.

```
        core          ← everything depends on this
       /  |  \
  scenarios | reporter | replay
       \  |  /    |
          cli       |
          |         |
       apps/web (single Next.js app)
```

| Package | Description | Version |
|---------|-------------|---------|
| `@ocpp-debugkit/core` | Data model, trace parser, event normalizer, timeline, failure detection | [![npm](https://img.shields.io/npm/v/@ocpp-debugkit/core.svg)](https://www.npmjs.com/package/@ocpp-debugkit/core) |
| `@ocpp-debugkit/scenarios` | Predefined trace scenarios for testing | [![npm](https://img.shields.io/npm/v/@ocpp-debugkit/scenarios.svg)](https://www.npmjs.com/package/@ocpp-debugkit/scenarios) |
| `@ocpp-debugkit/reporter` | Report generators (Markdown) | [![npm](https://img.shields.io/npm/v/@ocpp-debugkit/reporter.svg)](https://www.npmjs.com/package/@ocpp-debugkit/reporter) |
| `@ocpp-debugkit/cli` | Command-line interface | [![npm](https://img.shields.io/npm/v/@ocpp-debugkit/cli.svg)](https://www.npmjs.com/package/@ocpp-debugkit/cli) |
| `@ocpp-debugkit/replay` | Replay engine | _planned (v0.2.0)_ |
| `@ocpp-debugkit/react` | Reusable React components | _planned (v0.2.0)_ |
| `apps/web` | Single Next.js app (landing, inspector, docs) | — |

**Build order:** core → scenarios/reporter/replay → cli → app

## Quickstart

### From source

```bash
git clone https://github.com/ocpp-debugkit/ocpp-debugkit.git
cd ocpp-debugkit
pnpm install
pnpm build
```

### CLI

Packages are published to npm under the `@ocpp-debugkit` scope:

```bash
npm install -g @ocpp-debugkit/cli
ocpp-debugkit inspect trace.json
```

Other commands:

```bash
ocpp-debugkit report trace.json --output report.md
ocpp-debugkit scenario list
ocpp-debugkit scenario run failed-auth
```

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
