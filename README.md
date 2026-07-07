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
- **Scenario Evaluator** — Run predefined scenarios through the analysis engine
  and compare detected vs expected failures.
- **Report Generation** — Export session analysis as Markdown or HTML reports.
- **CLI** — Analyze traces from the command line.
- **Browser-Local** — All trace processing happens in your browser. No data
  leaves your machine when using the web app.

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

| Package | Description |
|---------|-------------|
| `@ocpp-debugkit/core` | Data model, trace parser, event normalizer, timeline, failure detection |
| `@ocpp-debugkit/scenarios` | Predefined trace scenarios for testing |
| `@ocpp-debugkit/reporter` | Report generators (Markdown, HTML) |
| `@ocpp-debugkit/cli` | Command-line interface |
| `@ocpp-debugkit/replay` | Replay engine (v0.2+) |
| `@ocpp-debugkit/react` | Reusable React components (v0.2+) |
| `apps/web` | Single Next.js app (landing, inspector, docs) |

**Build order:** core → scenarios/reporter/replay → cli → app

## Quickstart

> Packages are not yet published to npm. This section will be updated when
> v0.1.0 is released.

### From source

```bash
git clone https://github.com/ocpp-debugkit/ocpp-debugkit.git
cd ocpp-debugkit
pnpm install
pnpm build
```

### CLI (when published)

```bash
npm install -g @ocpp-debugkit/cli
ocpp-debugkit inspect trace.json
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
