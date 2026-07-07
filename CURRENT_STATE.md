# CURRENT_STATE.md

> Living document — updated inside every PR before merge.

## Current Version

`0.0.0` (pre-release, no packages published yet)

## Active Milestone

**v0.1.0 — Inspector MVP**

Building the first usable release: trace → timeline → failures detected →
report exported. CLI and web inspector.

## What's Done

### GitHub Infrastructure

- ✅ GitHub milestones created (M0, M0.5, v0.1.0, v0.2.0, v0.3.0, v1.0.0)
- ✅ GitHub labels created (type, package, priority, workflow)
- ✅ Tracking issues created for M0, M0.5, and v0.1.0 (#20–#32)

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

### Protocol & Trace-Format Design (PR #19)

- ✅ 9 ADRs covering all design decisions
- ✅ `docs/trace-format-spec.md` — full trace format specification
- ✅ 3 synthetic trace fixtures in `packages/core/src/__fixtures__/`
- ✅ Proposed canonical types and fixture validation tests

### Core Package — Data Model + Parser + Normalizer (PR #33)

- ✅ `packages/core/src/schemas.ts` — Zod schemas for all input types
- ✅ `packages/core/src/normalizer.ts` — `normalizeEvents()`, direction inference (ADR-0004), timestamp normalization (ADR-0005)
- ✅ `packages/core/src/parser.ts` — `parseTrace()` accepting JSON Object, JSONL, bare array
- ✅ `packages/core/src/types.ts` — updated with `Failure`, `Scenario`, `SessionSummary`, `ValidationResult` types
- ✅ 78 unit tests (46 normalizer + 32 parser)

### Core Package — Timeline + Detection + Summarizer + Validator (PR #34)

- ✅ `packages/core/src/timeline.ts` — `buildSessionTimeline()` correlating events by `transactionId` (ADR-0006)
- ✅ `packages/core/src/detection.ts` — `detectFailures()` with 3 rules: `FAILED_AUTHORIZATION`, `CONNECTOR_FAULT`, `STATION_OFFLINE_DURING_SESSION`
- ✅ `packages/core/src/summarizer.ts` — `summarizeSession()` / `summarizeSessions()` producing overview stats
- ✅ `packages/core/src/validator.ts` — `validateMessage()` / `validateMessages()` checking OCPP 1.6 JSON structural compliance
- ✅ 40 additional tests (10 timeline + 11 detection + 5 summarizer + 14 validator)

### Core Package — Public API Export + Package Config (PR #35)

- ✅ Barrel export complete (types, schemas, parser, normalizer, timeline, detection, summarizer, validator, fixtures)
- ✅ `sideEffects: false` for tree-shaking
- ✅ `files` field limits published content to `dist/` + docs
- ✅ `keywords`, `repository`, `homepage`, `bugs` fields for npm discoverability
- ✅ Package is npm-publish-ready (`access: public`)

### CI Fixes (PR #36, #37)

- ✅ Bumped `actions/checkout` and `actions/setup-node` to v5 (Node.js 20 deprecation)
- ✅ Pinned `changesets/action` to `v1.9.0`
- ✅ Fixed root `changeset` script: `"changeset add"` → `"changeset"` (was causing release workflow failures)

### Scenarios Package (in progress — this PR)

- ✅ `packages/scenarios/` — new package
- ✅ 5 scenarios: normal-session, failed-auth, connector-fault, station-offline, unexpected-stop-reason
- ✅ Scenario registry with `getScenario()` lookup
- ✅ Each scenario's `expectedFailures` aligns with v0.1 detection rules
- ✅ 21 tests (registry, engine integration, synthetic data policy)

## What's Next

1. **Issue #20** → complete (PR #33): data model + parser + normalizer
2. **Issue #21** → complete (PR #34): timeline + detection + summarizer + validator
3. **Issue #22** → complete (PR #35): public API export + package config
4. **Issue #23** (this PR) → complete: scenarios package (format + 5 initial scenarios)
5. **Issue #24**: Reporter package (Markdown report generator)
6. **Issue #25**: CLI package (scaffold + inspect + report + scenario commands)

## Known Blockers / Decisions Pending

- None currently. All design decisions resolved in ADRs.

## Package Status Table

| Package | Status | Version |
|---------|--------|---------|
| `@ocpp-debugkit/core` | in progress (package config finalized, ready for downstream) | 0.0.0 |
| `@ocpp-debugkit/scenarios` | in progress (5 scenarios + registry) | 0.0.0 |
| `@ocpp-debugkit/reporter` | not started | — |
| `@ocpp-debugkit/cli` | not started | — |
| `@ocpp-debugkit/replay` | not started | — |
| `@ocpp-debugkit/react` | not started | — |
| `apps/web` | not started | — |
