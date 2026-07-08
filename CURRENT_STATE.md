# CURRENT_STATE.md

> Living document — updated inside every PR before merge.

## Current Version

`0.1.0` — Inspector MVP (released)

## Active Milestone

**v0.1.0 — Inspector MVP (complete)**

All v0.1.0 issues complete. Packages published to npm. Web app deployed.

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

## What's Next

1. **v0.1.0 release** — merge version PR, CI publishes packages, creates tag + GitHub release
2. **v0.2.0** — Scenario evaluator & replay (new failure rules, replay engine, @ocpp-debugkit/react)
3. **v0.3.0** — Integrations & OSS credibility (trace diffing, CI mode, anonymize, examples)

## Known Blockers / Decisions Pending

- None currently. All design decisions resolved in ADRs.

## Package Status Table

| Package | Status | Version |
|---------|--------|---------|
| `@ocpp-debugkit/core` | done (v0.1.0) | 0.1.0 |
| `@ocpp-debugkit/scenarios` | done (v0.1.0) | 0.1.0 |
| `@ocpp-debugkit/reporter` | done (v0.1.0) | 0.1.0 |
| `@ocpp-debugkit/cli` | done (v0.1.0) | 0.1.0 |
| `@ocpp-debugkit/replay` | not started | — |
| `@ocpp-debugkit/react` | not started | — |
| `apps/web` | done (v0.1.0) | — |
