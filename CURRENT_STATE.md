# CURRENT_STATE.md

> Living document — updated inside every PR before merge.

## Current Version

`0.0.0` (pre-release, no packages published yet)

## Active Milestone

**M0.5 — Protocol & Trace-Format Design Phase**

Design spike resolving all foundational design decisions before core
implementation. Produces ADRs, trace format specification, and synthetic
trace fixtures that validate the proposed internal event model.

## What's Done

### GitHub Infrastructure

- ✅ GitHub milestones created (M0, M0.5, v0.1.0, v0.2.0, v0.3.0, v1.0.0)
- ✅ GitHub labels created (type, package, priority, workflow)
- ✅ Tracking issues created for M0 and M0.5

### Monorepo & Tooling (PR #12)

- ✅ Root `package.json` with pnpm workspace
- ✅ `pnpm-workspace.yaml` (`packages/*`, `apps/*`)
- ✅ `tsconfig.base.json` (strict TypeScript config)
- ✅ ESLint flat config (typescript-eslint strict)
- ✅ Prettier config + `.editorconfig`
- ✅ Vitest config + example passing test
- ✅ Turborepo config (build, test, lint, typecheck, clean)
- ✅ `NOTICE` file (Apache 2.0)
- ✅ `AGENTS.md` + `CURRENT_STATE.md` (initial versions)

### CI & Release (PR #13)

- ✅ `.github/workflows/ci.yml` — lint, format check, typecheck, test, build on PR + push
- ✅ `.github/workflows/release.yml` — Changesets version PR, npm publish, ecosystem tag + GitHub release
- ✅ `.changeset/config.json` — public access, base branch main

### GitHub Templates (PR #14)

- ✅ `.github/PULL_REQUEST_TEMPLATE.md`
- ✅ `.github/ISSUE_TEMPLATE/bug_report.md`
- ✅ `.github/ISSUE_TEMPLATE/feature_request.md`
- ✅ `.github/ISSUE_TEMPLATE/scenario_request.md`

### Community Docs (PR #15)

- ✅ `CONTRIBUTING.md` (setup, conventions, PR process, AI-assisted dev section)
- ✅ `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1)
- ✅ `ROADMAP.md` (milestone summary)
- ✅ `README.md` (description, badges, architecture, quickstart, support, links)
- ✅ `SECURITY.md` (vulnerability reporting, security principles)

### Protocol & Trace-Format Design (in progress — this PR)

- ✅ 9 ADRs covering all design decisions:
  - ADR-0001: OCPP version scope (1.6 JSON primary)
  - ADR-0002: Input trace formats (JSON Object + JSONL)
  - ADR-0003: Canonical internal event model
  - ADR-0004: Message direction representation
  - ADR-0005: Timestamp normalization
  - ADR-0006: Session correlation strategy
  - ADR-0007: Malformed trace handling
  - ADR-0008: Browser-local processing & privacy
  - ADR-0009: Future protocol-version extensibility
- ✅ `docs/trace-format-spec.md` — full trace format specification
- ✅ 3 synthetic trace fixtures in `packages/core/src/__fixtures__/`:
  - `normal-session.json` — complete charging session (no failures)
  - `failed-auth.json` — failed authorization (expects `FAILED_AUTHORIZATION`)
  - `connector-fault.json` — connector fault during session (expects `CONNECTOR_FAULT`)
- ✅ `packages/core/src/types.ts` — proposed canonical types (`Event`, `Trace`, `Session`, etc.)
- ✅ `packages/core/src/fixtures/index.ts` — fixture registry
- ✅ `packages/core/src/fixtures.test.ts` — 28 validation tests proving fixtures conform to the proposed event model

## What's Next

1. **M0.5 complete** → maintainer reviews and merges this PR
2. Proceed to v0.1.0 (Inspector MVP):
   - Issue #13: Core data model + trace parser + event normalizer
   - Issue #14: Core timeline + failure detection + summarizer + validator
   - Issue #15: Core public API export + package config
   - Issue #16: Scenarios package (format + 5 initial scenarios)
   - Issue #17: Reporter package (Markdown report generator)
   - Issue #18: CLI package (scaffold + inspect + report + scenario commands)

## Known Blockers / Decisions Pending

- None currently. All design decisions resolved in ADRs.

## Package Status Table

| Package | Status | Version |
|---------|--------|---------|
| `@ocpp-debugkit/core` | in progress (types + fixtures) | 0.0.0 |
| `@ocpp-debugkit/scenarios` | not started | — |
| `@ocpp-debugkit/reporter` | not started | — |
| `@ocpp-debugkit/cli` | not started | — |
| `@ocpp-debugkit/replay` | not started | — |
| `@ocpp-debugkit/react` | not started | — |
| `apps/web` | not started | — |
