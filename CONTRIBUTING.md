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
git clone https://github.com/ocpp-debugkit/ocpp-debugkit.git
cd ocpp-debugkit

# Install dependencies
pnpm install

# Verify everything works
pnpm lint
pnpm test
pnpm build
```

## Monorepo Structure

```
ocpp-debugkit/
├── packages/
│   ├── core/          # Data model, parser, normalizer, timeline, failure detection
│   ├── scenarios/     # Predefined trace scenarios for testing
│   ├── reporter/      # Report generators (Markdown, HTML)
│   ├── cli/           # Command-line interface
│   ├── replay/        # Replay engine (v0.2+)
│   └── react/         # Reusable React components (v0.2+)
├── apps/
│   └── web/           # Single Next.js app (landing, inspector, docs, blog)
└── ...
```

See [`AGENTS.md`](./AGENTS.md) for a detailed overview of the architecture,
build commands, and package dependency graph.

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
pnpm typecheck
pnpm test
pnpm build
```

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

- Open a [GitHub Issue](https://github.com/ocpp-debugkit/ocpp-debugkit/issues)
- Read the [documentation](https://ocppdebugkit.com/docs)
- Check the [roadmap](./ROADMAP.md)
