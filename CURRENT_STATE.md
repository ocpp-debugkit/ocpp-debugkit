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

### Community Docs (in progress — this PR)
- ✅ `CONTRIBUTING.md` (setup, conventions, PR process, AI-assisted dev section)
- ✅ `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1)
- ✅ `ROADMAP.md` (milestone summary)
- ✅ `README.md` (description, badges, architecture, quickstart, support, links)
- ✅ `SECURITY.md` (vulnerability reporting, security principles)

## What's Next

1. **M0 complete** → maintainer reviews and merges PRs #12–#15
2. Add required status checks to branch protection (after CI runs on main)
3. Proceed to M0.5 (Protocol & Trace-Format Design Phase)

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
