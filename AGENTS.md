# AGENTS.md

> **Repository guide for AI coding agents.** This file is tool-neutral and
> contains no references to specific AI tools. Point your agent here to get
> productive quickly.

## Project Overview

OCPP DebugKit is an open-source DevTools project for debugging OCPP (Open
Charge Point Protocol) charging sessions. It provides a trace inspector,
failure detection, scenario evaluation, replay, and reporting for EV charging
infrastructure developers.

**License:** Apache 2.0
**Language:** TypeScript (strict mode)
**Package Manager:** pnpm 10.x
**Node:** >= 20.0.0

## Monorepo Structure

```
ocpp-debugkit/
├── packages/
│   └── toolkit/        # Single npm package @ocpp-debugkit/toolkit
│       └── src/
│           ├── core/       # Data model, parser, normalizer, timeline, failure detection
│           ├── scenarios/  # Predefined trace scenarios for testing
│           ├── reporter/   # Report generators (Markdown, HTML)
│           ├── replay/     # Replay engine
│           ├── react/      # Reusable React components
│           └── cli/        # Command-line interface (bin: ocpp-debugkit)
├── apps/
│   └── web/           # Single Next.js app (landing, inspector, docs, blog)
├── turbo.json          # Turborepo task pipeline
├── tsconfig.base.json  # Shared TypeScript strict config
├── eslint.config.js    # ESLint flat config
├── vitest.config.ts    # Vitest test config
└── pnpm-workspace.yaml
```

## Build Commands

```bash
pnpm install          # Install dependencies
pnpm build            # Build all packages (via Turbo)
pnpm test             # Run tests
pnpm lint             # Run ESLint
pnpm typecheck        # Run TypeScript type checking (via Turbo)
pnpm format           # Format code with Prettier
pnpm format:check     # Check formatting without writing
pnpm changeset        # Add a changeset for release
```

## Package Dependency Graph

```
@ocpp-debugkit/toolkit (single package, subpath exports)
  src/
    core         ← internal modules depend on this
    scenarios    ← depends on core (internal)
    reporter     ← depends on core (internal)
    replay       ← depends on core (internal)
    react        ← depends on core, scenarios, reporter, replay (internal)
    cli          ← depends on core, scenarios, reporter (internal; Node-only)

apps/web (single Next.js app)
  imports: @ocpp-debugkit/toolkit/core, /scenarios, /reporter, /react, /replay
```

**Build order:** toolkit (all internal modules in one tsc pass) → app

## Testing Conventions

- Tests use **Vitest**.
- Test files: `*.test.ts` / `*.spec.ts`.
- Tests live next to the code they test (e.g., `src/parser.test.ts`).
- Run tests: `pnpm test` (root) or `pnpm test` (package-level).
- Coverage target: 70%+ for core package.

## Commit Conventions

This project uses **Conventional Commits**:

```
feat(core): implement trace parser for JSON input
fix(cli): handle missing trace file gracefully
docs: add architecture overview to docs
chore: add vitest configuration
test(core): add parser edge case tests
```

### Branch Naming

```
feat/<scope>-<description>     # e.g. feat/core-parse-trace
fix/<scope>-<description>      # e.g. fix/cli-stdout-encoding
chore/<description>            # e.g. chore/ci-workflow
docs/<description>             # e.g. docs/readme
test/<description>             # e.g. test/core-coverage
```

## PR Conventions

- **One concern per PR.** Code, tests, docs, package config, and changeset
  ship together.
- **Tests required.** No PR merges without tests for the behavior it introduces.
- **Changeset required** for any PR that changes publishable package behavior.
- **Living docs updated inside the PR** — `CURRENT_STATE.md`, `AGENTS.md` if
  architecture changes.
- **CI must be green** — lint, typecheck, test, build.

## Code Style

- **TypeScript strict mode** — no `any` without justification.
- **Prettier** for formatting (single quotes, trailing commas, 100 char width).
- **ESLint** with `typescript-eslint` strict rules.
- Use `import type` for type-only imports.

## Security Constraints

- Trace files and pasted content are **untrusted input**. Validate at every
  external entry point (CLI args, file content, paste input).
- Safe JSON parsing with try/catch and size guards.
- No `eval()`, `Function()`, or dynamic code execution on untrusted input.
- No `dangerouslySetInnerHTML` or unsafe HTML injection.
- Browser-local processing by default — no automatic uploading of user data.
- File-size and event-count limits enforced on trace input.
- No secrets, tokens, or credentials in committed files.
- No personal or sensitive information in committed artifacts (trace fixtures,
  sample data, test data, examples). User-loaded traces and runtime-generated
  reports are **not** subject to this rule.

## Current Status

See [`CURRENT_STATE.md`](./CURRENT_STATE.md) for what has been built, what is
in progress, and what is next.

## Design Decisions

The protocol and trace-format design is documented in
[`docs/adr/`](./docs/adr/) (Architecture Decision Records) and
[`docs/trace-format-spec.md`](./docs/trace-format-spec.md). Key decisions:

- **OCPP 1.6 JSON** is the primary protocol for v0.1. OCPP 2.0.1 is deferred but the architecture supports it (ADR-0001).
- **Two trace formats:** JSON Object (metadata + events array) and JSONL (one event per line). Bare arrays accepted as degenerate (ADR-0002).
- **Canonical `Event` type** with `id`, `messageId`, `timestamp`, `direction`, `messageType`, `action`, `payload`, `rawMessage` (ADR-0003).
- **Direction** is explicit (`CS_TO_CSMS`, `CSMS_TO_CS`, `UNKNOWN`), inferred from action name when missing (ADR-0004).
- **Timestamps** normalized to epoch milliseconds. Missing timestamps are `null`. Out-of-order events are flagged, not silently reordered (ADR-0005).
- **Sessions** derived by correlating `transactionId`, with `connectorId` and `stationId` as secondary groupings (ADR-0006).
- **Malformed traces:** structural errors fail-fast; event-level errors skip-and-flag; size/count limits enforced (ADR-0007).
- **Browser-local processing:** all trace processing client-side. No auto-upload. No telemetry on trace content (ADR-0008).
- **Extensibility:** version-aware, not version-hardcoded. Adding OCPP 2.0.1 is additive (ADR-0009).

## Contributor Guide

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for setup, conventions, and the
contribution workflow.
