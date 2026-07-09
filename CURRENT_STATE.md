# CURRENT_STATE.md

> Living document — updated inside every PR before merge.

## Current Version

`0.2.1` — Packaging Consolidation + Scenario Evaluator & Replay (published)

## Active Milestone

**v0.3.0 — Integrations & OSS Credibility (in progress)**

v0.2.1 is published to npm. Old v0.1.1 packages are deprecated. v0.3.0 adds
trace diffing, rich scenario assertions, CI/anonymize/diff CLI commands,
integration examples, and contributor onboarding.

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

### Scenarios Package (PR #39)

- ✅ `packages/scenarios/` — new package
- ✅ 5 scenarios: normal-session, failed-auth, connector-fault, station-offline, unexpected-stop-reason
- ✅ Scenario registry with `getScenario()` lookup
- ✅ Each scenario's `expectedFailures` aligns with v0.1 detection rules
- ✅ 21 tests (registry, engine integration, synthetic data policy)

### Reporter Package (PR #40)

- ✅ `packages/reporter/` — new package
- ✅ `generateMarkdownReport()` — session overview, timeline summary, failures, suggested steps, event appendix
- ✅ `AnalysisResult` input type
- ✅ 11 tests (structure, failure inclusion, readability, metadata, severity)

### CLI Package (PR #41)

- ✅ `packages/cli/` — new package
- ✅ `ocpp-debugkit inspect <file>` — parse + analyze + output
- ✅ `ocpp-debugkit report <file>` — generate Markdown report (stdout or file)
- ✅ `ocpp-debugkit scenario list` — list all 5 scenarios
- ✅ `ocpp-debugkit scenario run <name>` — run scenario through analysis engine, compare detected vs expected
- ✅ Path safety: validated file paths, size limits
- ✅ Input validation: safe parsing, non-sensitive errors
- ✅ 17 integration tests (execa-based)
- ✅ Converted JSON fixtures to TS modules (fixes Node.js ESM JSON import issue)

### Next.js App Scaffold (PR #42)

- ✅ `apps/web/` — single Next.js app (App Router)
- ✅ Tailwind CSS initialized
- ✅ Routes: `/` (placeholder), `/inspector` (placeholder), `/docs` (placeholder)
- ✅ Workspace dependencies on `@ocpp-debugkit/core`, `scenarios`, `reporter`
- ✅ `"private": true` (never publishable to npm)

### Landing Page + Inspector (PR #43)

- ✅ Landing page: hero, features, what-it's-not, architecture, quick start, footer
- ✅ Inspector: trace paste textarea + file upload + sample scenario selector
- ✅ Inspector: session timeline (click events to inspect)
- ✅ Inspector: message inspector panel (raw + normalized fields)
- ✅ Inspector: failure summary (severity, description, suggested steps)
- ✅ Inspector: Markdown report export (download)

### Inspector Polish (PR #44)

- ✅ Loading state with spinner ("Parsing trace…")
- ✅ Error state improvements (non-sensitive messages, empty input guidance)
- ✅ Responsive layout (mobile-friendly: flex-wrap, smaller text on small screens)
- ✅ Keyboard navigation (arrow up/down to move through events)
- ✅ Sticky header for better UX on long traces
- ✅ Analyze button shows "Analyzing…" and disables during parsing

### Playwright Smoke Tests (PR #45)

- ✅ `playwright.config.ts` — chromium, auto-start dev server
- ✅ Landing page tests: page loads, hero, CTA links, features, footer
- ✅ Navigation tests: landing → inspector, landing → docs
- ✅ Inspector tests: empty state, sample scenario → timeline, failures, event click → message inspector, export button, invalid input error
- ✅ CI workflow updated: install browsers + run E2E after unit tests

### Docs Content (PR #46)

- ✅ `/docs` index with navigation sidebar
- ✅ `/docs/quickstart`, `/docs/glossary`, `/docs/architecture`, `/docs/trace-format`, `/docs/cli`, `/docs/scenarios`

### Packaging Consolidation (v0.2.0 Phase 0 — complete)

- ✅ `packages/toolkit/` — single `@ocpp-debugkit/toolkit` package created (PR #55)
- ✅ Core, scenarios, reporter, CLI code moved into `src/core/`, `src/scenarios/`, `src/reporter/`, `src/cli/`
- ✅ `src/replay/` and `src/react/` modules added
- ✅ Subpath exports configured (`/core`, `/scenarios`, `/reporter`, `/replay`, `/react`, `/cli`, `/fixtures`)
- ✅ CLI binary `ocpp-debugkit` via `package.json#bin`
- ✅ Old package directories removed
- ✅ Web app updated to consume `@ocpp-debugkit/toolkit`
- ✅ All 196 existing tests pass from new locations
- ✅ Build, lint, typecheck, format all green
- ✅ `private: true` set to prevent premature auto-publish (PR #67)
- ✅ External fixture test + CI (PR #69)
- ✅ Migration docs + ADR-0010 (PR #71)
- ✅ Release workflow simplified for single package (PR #72)

### v0.2.0 Features (complete)

- ✅ Expanded failure detection — 7 new rules (PR #70): TIMEOUT_NO_HEARTBEAT, METER_VALUE_GAP,
  INVALID_STOP_REASON, UNEXPECTED_START, STATUS_TRANSITION_VIOLATION, DIAGNOSTICS_FAILURE,
  FIRMWARE_UPDATE_FAILURE
- ✅ 10 total scenarios + CLI external scenario files (PR #75)
- ✅ Replay engine implementation + tests (PR #74)
- ✅ HTML report format + CLI --format html (PR #73)
- ✅ React components extracted from inspector (PR #76)
- ✅ App replay UI + report viewer + react refactor (PR #77)

### v0.2.1 Release

- ✅ `@ocpp-debugkit/toolkit@0.2.1` published to npm (PR #79)
- ✅ Old v0.1.1 packages (`@ocpp-debugkit/core`, `scenarios`, `reporter`, `cli`) deprecated on npm
- ✅ Git tag `v0.2.1` + GitHub release `v0.2.1` created
- ✅ Docs updated for v0.2 content (PR #78)
- ✅ Web app fixes — npm links, inspector nav, docs prose styling (PR #80, #81)

### v0.3.0 — In Progress

- ✅ Toolkit package README improved (PR #93, Issue #82)
- ✅ Post-v0.2.1 milestone boundary audit (PR #94, Issue #83)
- ✅ v0.3 failure detection rules — 5 new rules (Issue #84):
  `SUSPICIOUS_SESSION_DURATION`, `SLOW_RESPONSE`, `HEARTBEAT_INTERVAL_VIOLATION`,
  `METER_VALUE_ANOMALY`, `UNRESPONSIVE_CSMS` (15 total rules)
- ✅ Trace diffing — `diffTraces()` API (Issue #85)
- ✅ Rich scenario assertions — 8 assertion types, `evaluateScenario()` (Issue #86)
- ✅ Assert-based scenarios — 5 new scenarios (15 total) + `compareScenarioReports()` (Issue #87)

## What's Next

1. **v0.3.0 — Integrations & OSS Credibility** — Trace diffing, rich scenario
   assertions, CI/anonymize/diff CLI commands, integration examples, contributor
   onboarding (Issues #82–#92)
2. **v1.0.0** — API stabilization, 20+ scenarios, docs overhaul, contributor
   onboarding

## Known Blockers / Decisions Pending

- None currently. All design decisions resolved in ADRs.

## Package Status Table

| Package | Status | Version |
|---------|--------|---------|
| `@ocpp-debugkit/toolkit` | published | 0.2.1 |
| `@ocpp-debugkit/core` | deprecated | 0.1.1 |
| `@ocpp-debugkit/scenarios` | deprecated | 0.1.1 |
| `@ocpp-debugkit/reporter` | deprecated | 0.1.1 |
| `@ocpp-debugkit/cli` | deprecated | 0.1.1 |
| `apps/web` | deployed | — |
