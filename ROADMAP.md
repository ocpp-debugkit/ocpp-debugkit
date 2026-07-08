# Roadmap

> OCPP DebugKit — Open-source DevTools for debugging OCPP charging sessions.

This roadmap tracks the milestone-based development of OCPP DebugKit.
Each milestone maps to a semantic version release.

---

## M0 — Repository & Tooling Foundation

**Status:** ✅ Complete (merged via PR #12–#15)

Professional monorepo skeleton with CI, linting, testing, release tooling,
GitHub metadata, and agent onboarding docs — before any feature code lands.

- pnpm monorepo + workspace
- TypeScript strict config
- ESLint + Prettier + EditorConfig
- Vitest + example test
- Turborepo pipeline
- GitHub Actions CI
- Changesets release workflow
- GitHub labels, milestones, PR/issue templates
- README, CONTRIBUTING, CODE_OF_CONDUCT, ROADMAP, AGENTS.md, CURRENT_STATE.md

**Exit criteria:** `pnpm install` / `pnpm test` / `pnpm lint` / `pnpm build`
all work. CI green on main. No release yet — infrastructure only.

---

## M0.5 — Protocol & Trace-Format Design Phase

**Status:** ✅ Complete (merged via PR #19)

Resolve all foundational design decisions before core implementation.
Produce ADRs and synthetic fixtures that validate the internal model.

- OCPP version scope (1.6 JSON primary, extensible to 2.0.1)
- Input trace formats (JSON, JSONL)
- Canonical internal event model
- Message direction and timestamp normalization
- Station, connector, transaction correlation
- Malformed/incomplete trace handling
- Browser-local processing and privacy
- ADRs for each major decision
- 3+ synthetic trace fixtures

**Exit criteria:** ADRs written, trace format spec documented, fixtures
validate against proposed model. Maintainer approves design.

---

## v0.1.0 — Inspector MVP

**Status:** ✅ Released — GitHub release `release-v0.1.0`, packages published
to npm at 0.1.1 (`@ocpp-debugkit/core`, `scenarios`, `reporter`, `cli`).
Web app deployed at ocppdebugkit.com.

A user visits ocppdebugkit.com, loads a trace, sees a timeline, sees detected
failures, and exports a report — without installing anything. Developers can
also use the CLI locally.

- **Core:** Trace parser, event normalizer, session timeline, failure detection
  (3 rules), summarizer, validator, package config
- **Scenarios:** 5 initial scenarios with expected failures
- **Reporter:** Markdown report generator
- **CLI:** inspect, report, scenario list/run commands
- **App:** Single Next.js app (landing, inspector, docs)
- **Tests:** Playwright smoke tests
- **Docs:** Quickstart, glossary, architecture, CLI reference, scenarios

**Exit criteria:** Hosted demo, CLI on npm, trace→timeline→failures→report
workflow, 5 scenarios, 3 failure rules, GitHub release `release-v0.1.0`. ✅ All
met.

---

## v0.2.0 — Scenario Evaluator & Replay

**Status:** Next up

Make the tool genuinely useful for developers' daily workflows.

- Expanded failure detection rules (7 new rules)
- 10 total scenarios
- Replay engine package
- Extracted React components package
- CLI: external scenario files, offline evaluator
- HTML report format
- App: replay UI, report viewer, React refactor

**Exit criteria:** GitHub release `release-v0.2.0`.

---

## v0.3.0 — Integrations & OSS Credibility

**Status:** Not started

Connect to real ecosystem workflows. Attract external engagement.

- v0.3 failure detection rules
- Trace diffing
- Rich scenario assertions
- CLI: CI mode, anonymize, diff commands
- Integration examples (simple-trace, simple-csms, simulator-output, etc.)
- Contribution guide + good-first-issues

**Exit criteria:** GitHub release `release-v0.3.0`.

---

## v1.0.0 — Stable FOSS Ecosystem

**Status:** Not started

Mature APIs, stable formats, contributor-ready.

- API stabilization
- 20+ scenarios
- Docs overhaul (tutorials, deep-dives)
- Release workflow hardening
- Contributor onboarding

**Exit criteria:** GitHub release `release-v1.0.0`.

---

## Future Considerations

Explicitly out of scope for v1.0 but may be revisited:

- **Active scenario runner** — connects to live charging stations or CSMS
  endpoints via WebSocket. Requires transport, timing, state management, and
  protocol interaction design.
- **Playground** (`/playground`) — interactive OCPP message composer/sandbox.
- **YAML trace format support** — JSON first, YAML later if useful.
