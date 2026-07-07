# CURRENT_STATE.md

> Living document — updated inside every PR before merge.

## Current Version

`0.0.0` (pre-release, no packages published yet)

## Active Milestone

**M0 — Repository & Tooling Foundation**

Setting up the professional monorepo skeleton with CI, linting, testing,
release tooling, GitHub metadata, and agent onboarding docs — before any
feature code lands.

## What's Done

### GitHub Infrastructure
- ✅ GitHub milestones created (M0, M0.5, v0.1.0, v0.2.0, v0.3.0, v1.0.0)
- ✅ GitHub labels created (type, package, priority, workflow)
- ✅ 11 tracking issues created and assigned to M0 milestone

### Monorepo & Tooling (in progress — PR #12)
- ✅ Root `package.json` with pnpm workspace
- ✅ `pnpm-workspace.yaml` (`packages/*`, `apps/*`)
- ✅ `tsconfig.base.json` (strict TypeScript config)
- ✅ ESLint flat config (typescript-eslint strict)
- ✅ Prettier config + `.editorconfig`
- ✅ Vitest config + example passing test
- ✅ Turborepo config (build, test, lint, typecheck, clean)
- ✅ `NOTICE` file (Apache 2.0)
- ✅ `AGENTS.md` + `CURRENT_STATE.md` (initial versions)

### CI & Release (in progress — this PR)
- ✅ `.github/workflows/ci.yml` — lint, format check, typecheck, test, build on PR + push
- ✅ `.github/workflows/release.yml` — Changesets version PR, npm publish, ecosystem tag + GitHub release
- ✅ `.changeset/config.json` — public access, base branch main

### GitHub Templates (in progress — this PR)
- ✅ `.github/PULL_REQUEST_TEMPLATE.md`
- ✅ `.github/ISSUE_TEMPLATE/bug_report.md`
- ✅ `.github/ISSUE_TEMPLATE/feature_request.md`
- ✅ `.github/ISSUE_TEMPLATE/scenario_request.md`



1. **PR4** (Issues #9–#11): CONTRIBUTING, CODE_OF_CONDUCT, ROADMAP, README
2. **M0 complete** → proceed to M0.5 (Protocol & Trace-Format Design Phase)

## Known Blockers / Decisions Pending

- None currently.

## Package Status Table

| Package | Status | Version |
|---------|--------|---------|
| `@ocpp-debugkit/core` | not started | — |
| `@ocpp-debugkit/scenarios` | not started | — |
| `@ocpp-debugkit/reporter` | not started | — |
| `@ocpp-debugkit/cli` | not started | — |
| `@ocpp-debugkit/replay` | not started | — |
| `@ocpp-debugkit/react` | not started | — |
| `apps/web` | not started | — |
