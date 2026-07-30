# Contributing to OCPP DebugKit

Thank you for your interest in contributing to OCPP DebugKit! This document
covers setup, conventions, and the contribution workflow.

## Getting Started

### Prerequisites

- **Node.js** >= 20.0.0
- **pnpm** 10.x (`npm install -g pnpm`)
- **Git**

### Local Setup

```bash
# Clone the repository
git clone https://github.com/ocpp-debugkit/toolkit.git
cd toolkit

# Install dependencies
pnpm install

# Verify everything works (same checks CI runs, in the same order)
pnpm lint
pnpm format:check
pnpm typecheck
pnpm build
pnpm test
```

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
└── ...
```

All modules ship in a single package, `@ocpp-debugkit/toolkit`, exposed via
subpath exports (`@ocpp-debugkit/toolkit/core`, `/scenarios`, `/reporter`,
`/replay`, `/react`, `/cli`, `/fixtures`). See
[ADR-0010](./docs/adr/0010-single-package-consolidation.md) for the rationale.

See [`AGENTS.md`](./AGENTS.md) for a detailed overview of the architecture,
build commands, and package dependency graph.

## Architecture Overview

OCPP DebugKit is a pnpm monorepo with a single published package
(`@ocpp-debugkit/toolkit`) and a single Next.js web app.

### Core Data Flow

```
Trace Input (JSON/JSONL)
  → parseTrace()           → Events[]
  → buildSessionTimeline() → Sessions[]
  → detectFailures()       → Failures[]
  → summarizeSessions()    → SessionSummary[]
```

Each step is a pure function — no side effects, no I/O. The CLI and web app
compose these functions to provide the full analysis pipeline.

### Key Modules

| Module | Location | Description |
|--------|----------|-------------|
| Types | `src/core/types.ts` | All TypeScript interfaces and type definitions |
| Schemas | `src/core/schemas.ts` | Zod validation schemas for input |
| Parser | `src/core/parser.ts` | `parseTrace()` — JSON, JSONL, bare array |
| Normalizer | `src/core/normalizer.ts` | Event normalization (timestamps, directions) |
| Timeline | `src/core/timeline.ts` | `buildSessionTimeline()` — session correlation |
| Detection | `src/core/detection.ts` | `detectFailures()` — failure detection rules |
| Diff | `src/core/diff.ts` | `diffTraces()` — compare two traces |
| Assertions | `src/core/assertions.ts` | `evaluateScenario()` — scenario assertions |
| Summarizer | `src/core/summarizer.ts` | Session summary statistics |
| Validator | `src/core/validator.ts` | OCPP 1.6 structural validation |
| Scenarios | `src/scenarios/` | Predefined scenarios + registry |
| Reporter | `src/reporter/` | Markdown + HTML report generators |
| Replay | `src/replay/` | Deterministic replay engine |
| React | `src/react/` | Reusable UI components |
| CLI | `src/cli/` | Command-line interface |

### Browser-Safe vs Node-Only

- `core`, `scenarios`, `reporter`, `replay`, `react`: browser-safe (no Node built-ins)
- `cli`: Node-only (uses `fs`, `path`, `process`). Never imported by browser code.

## Development Workflow

### 1. Find or Create an Issue

All work should be tracked via GitHub Issues. Check existing issues or create
a new one using the appropriate issue template (bug report, feature request,
or scenario request).

### 2. Create a Branch

```bash
git checkout -b feat/<scope>-<description>
```

### 3. Make Your Changes

- Follow the code style (TypeScript strict, Prettier, ESLint).
- Write tests for the behavior you introduce.
- Update documentation as needed.

### 4. Verify Locally

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm build
pnpm test
```

These are the checks CI runs, in the same order, so a green run here means a
green run there. CI stops at the first failure, which means a formatting problem
masks every result after it. `pnpm format:check` only reports; run `pnpm format`
to apply the fixes.

### 5. Add a Changeset

If your PR changes publishable package behavior, add a changeset:

```bash
pnpm changeset
```

This creates a file in `.changeset/` describing the change and which packages
are affected.

### 6. Open a Pull Request

- Use the PR template.
- Link the issue with `Closes #N`.
- Ensure CI passes (lint, typecheck, test, build).

## Conventions

### Commit Messages

This project uses [Conventional Commits](https://www.conventionalcommits.org/):

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

### Code Style

- **TypeScript strict mode** — no `any` without justification.
- **Prettier** for formatting (single quotes, trailing commas, 100 char width).
- **ESLint** with `typescript-eslint` strict rules.
- Use `import type` for type-only imports.

### Testing

- Tests use **Vitest**.
- Test files: `*.test.ts` / `*.spec.ts`.
- Tests live next to the code they test.
- Coverage target: 70%+ for core package.

#### Running Tests

```bash
pnpm test                    # Run all unit tests
pnpm test:external-fixture   # External fixture test (installs from tarball)
```

#### Writing Tests

- Test the **behavior**, not the implementation.
- Cover both positive (expected result) and negative (error/edge case) paths.
- Use the `makeEvent()` helper pattern from `detection.test.ts` for creating
  test events.
- For CLI tests, use the `execa`-based pattern from `cli.test.ts`.

## Contributing Scenarios

Scenarios are the most common first contribution. A scenario is a synthetic
trace with expected failure outcomes and optional assertions.

### How to Add a Scenario

1. Create a file in `packages/toolkit/src/scenarios/__scenarios__/`:
   ```typescript
   export default {
     name: 'my-scenario',
     description: 'Description of what the scenario tests.',
     trace: { /* synthetic trace data */ },
     expectedFailures: ['FAILED_AUTHORIZATION'],
     assertions: [
       { type: 'event_order', params: { actions: ['BootNotification', 'Authorize'] } }
     ],
   };
   ```

2. Import and register it in `packages/toolkit/src/scenarios/index.ts`.

3. Update the scenario count in every place that states it:
   - `packages/toolkit/src/scenarios/index.test.ts`
   - `tests/external-fixture/test.mjs`
   - `README.md`
   - `packages/toolkit/README.md`

   The first two fail the test suite when they drift. The two READMEs do not, so
   they are easy to miss.

4. Run `ocpp-debugkit ci` to verify all scenarios pass, then run the full local
   check from [Verify Locally](#4-verify-locally). `ocpp-debugkit ci` does not
   cover formatting, lint, or types.

5. Add a changeset with `pnpm changeset`, and pick **patch**. A new scenario does
   add a public export, but scenarios are test corpus rather than consumer API
   surface: nothing is built against an individual scenario constant, and the
   registry is consumed as a whole through `scenarios` and `getScenario()`.
   Minor and major releases are reserved for changes to the analysis engine, so
   version numbers keep lining up with the milestones in
   [ROADMAP.md](ROADMAP.md).

### Guidelines

- All data must be **synthetic** — no real station IDs, transaction IDs, idTags,
  or personal data.
- Use `SYNTHETIC-TAG-NNN` for idTags, `CS-SYNTHETIC-NNN` for station IDs.
- Each scenario takes its own station ID. Check the existing files in
  `__scenarios__/` for the next free number rather than reusing one.
- `expectedFailures` must align with detection rules available in the current
  version.
- Test your scenario with `ocpp-debugkit scenario run my-scenario`.

## Contributing Detection Rules

Detection rules identify failure patterns in traces.

**Every detection rule ships with a scenario that exercises it, added in the same
pull request as the rule.** A rule without a scenario has no regression guard, so
nothing in the corpus catches it breaking. This is the invariant that keeps the
scenario corpus honest as rules are added, and it means the scenario count in the
READMEs tracks real coverage rather than volume. See
[How to Add a Scenario](#how-to-add-a-scenario).

### How to Add a Detection Rule

1. Add the failure code to `FailureCode` in `packages/toolkit/src/core/types.ts`.

2. Add suggested steps and severity in `packages/toolkit/src/core/detection.ts`:
   ```typescript
   SUGGESTED_STEPS.MY_NEW_RULE = [
     'Step 1 to resolve the issue',
     'Step 2 to resolve the issue',
   ];
   SEVERITY.MY_NEW_RULE = 'warning';
   ```

3. Implement the detection function:
   ```typescript
   function detectMyNewRule(events: Event[]): Failure[] {
     const failures: Failure[] = [];
     // Detection logic
     return failures;
   }
   ```

4. Wire it into `detectFailures()`.

5. Add unit tests in `detection.test.ts` (positive + negative cases).

6. **Audit all existing scenarios** — new rules may trigger on existing fixtures.
   Fix false positives or add the new code to `expectedFailures`.

7. **Add a scenario that exercises the new rule**, in this same pull request,
   following [How to Add a Scenario](#how-to-add-a-scenario). This is the positive side of
   step 6: step 6 confirms the rule stays quiet where it should, and this confirms
   it fires where it should. A rule shipped without one is incomplete.

## Contributing Good-First-Issues

Good-first-issues are labeled with `good-first-issue` and are designed for
new contributors. They should:

- Have clear instructions and acceptance criteria
- Point to the relevant files and code
- Be scoped to a single concern
- Not require deep knowledge of the codebase

If you're a new contributor, look for issues with the `good-first-issue` label
on the [issues page](https://github.com/ocpp-debugkit/toolkit/issues).

### Claiming One

Comment on the issue saying you would like to work on it and it will be assigned
to you.

Please hold one open claim at a time. Once your pull request for it is merged,
say which issue you want next and it will be assigned. This keeps issues from
sitting claimed while another is still in review, so other newcomers can see what
is genuinely free.

## Security Guidelines

OCPP DebugKit processes untrusted input (trace files, pasted content). When
working on parsing, CLI, or UI code:

- **Validate all external input** — CLI args, file content, paste input.
- **Safe JSON parsing** — always use try/catch and enforce size limits.
- **No dynamic code execution** — no `eval()`, `Function()` on untrusted input.
- **No prototype pollution** — validate object shapes, use safe parsing.
- **Path safety** — validate file paths, prevent path traversal.
- **Safe rendering** — no `dangerouslySetInnerHTML`, no unsafe HTML injection.
- **Browser-local processing** — no automatic uploading of user data.
- **No secrets in committed files** — no credentials, API keys, or tokens.
- **No sensitive data in committed artifacts** — use synthetic data in trace
  fixtures, sample data, and test data. Real station IDs, transaction IDs, IPs,
  or personal information must not appear in committed files. User-loaded
  traces and runtime-generated reports are **not** subject to this rule — they
  contain the user's own data and must not be redacted.

If you discover a security vulnerability, please see the
[Security Policy](./SECURITY.md) for responsible disclosure.

## AI-Assisted Development

Maintainers may use AI-assisted development tools, but all contributions must
be reviewed, tested, documented, and scoped like normal engineering work.
AI-generated code is held to the same standards as any other contribution: it
must pass CI, include tests, be security-reviewed, and be understandable by a
human reviewer.

Contributors using AI agents can point them at [`AGENTS.md`](./AGENTS.md) for
a structured overview of this repository's architecture, conventions, and build
system. [`CURRENT_STATE.md`](./CURRENT_STATE.md) reflects what has been built
so far and what is in progress — use it to orient your agent before starting
work.

No AI tool preference is assumed or required. The project does not endorse any
specific AI tool.

## Living Documents

The following documents are updated as part of the work, inside the PR:

| Document | When updated |
|----------|-------------|
| `CURRENT_STATE.md` | Inside every PR, before merge |
| `AGENTS.md` | When architecture, packages, or build commands change |
| `CONTRIBUTING.md` | When contribution process or conventions change |
| `ROADMAP.md` | At each milestone boundary |
| `README.md` | When description, badges, quickstart, or links change |

## Questions?

- Open a [GitHub Issue](https://github.com/ocpp-debugkit/toolkit/issues)
- Read the [documentation](https://ocppdebugkit.com/docs)
- Check the [roadmap](./ROADMAP.md)
