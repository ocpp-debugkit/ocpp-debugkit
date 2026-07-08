# ADR-0010: Single Package Consolidation

## Status

Accepted

## Context

OCPP DebugKit was originally published as four independent npm packages under
the `@ocpp-debugkit` scope:

- `@ocpp-debugkit/core` — data model, trace parser, event normalizer, timeline,
  failure detection
- `@ocpp-debugkit/scenarios` — predefined trace scenarios for testing
- `@ocpp-debugkit/reporter` — report generators (Markdown)
- `@ocpp-debugkit/cli` — command-line interface

Two additional packages — `@ocpp-debugkit/replay` (replay engine) and
`@ocpp-debugkit/react` (reusable React components) — were planned for v0.2.0.

This multi-package layout created several problems:

1. **Version drift.** Each package was independently versioned. Consumers had
   to keep peer versions in sync, and a mismatch between `core` and `scenarios`
   could cause subtle runtime failures that were hard to diagnose.

2. **Cross-package coupling.** `scenarios`, `reporter`, and `cli` all depend on
   `core` types. A change to a `core` type required coordinated releases across
   all dependent packages, defeating the supposed independence.

3. **Installation friction.** Consumers needed to install and list multiple
   packages:

   ```bash
   npm install @ocpp-debugkit/core @ocpp-debugkit/scenarios @ocpp-debugkit/reporter
   ```

4. **Release overhead.** Each release required changeset coordination across
   multiple packages, multiple `npm publish` calls, and CI that had to build
   and test the full dependency graph in order.

5. **Small project, not a library ecosystem.** The packages are tightly coupled
   and maintained by a single team. The independence promised by the
   multi-package layout was theoretical — in practice, every meaningful change
   touched multiple packages simultaneously.

6. **Internal module boundaries are enough.** The actual source code already
   lives in a single `packages/toolkit` directory with subdirectories (`core`,
   `scenarios`, `reporter`, `replay`, `react`, `cli`). The npm package
   boundaries were a publishing artifact, not an architectural one.

## Decision

**Consolidate all four published packages into a single npm package,
`@ocpp-debugkit/toolkit`, exposed via subpath exports.**

### Package structure

```
@ocpp-debugkit/toolkit
  exports:
    .               # umbrella entry (re-exports core + scenarios)
    ./core          # data model, parser, normalizer, timeline, failure detection
    ./scenarios     # predefined trace scenarios
    ./reporter      # report generators (Markdown, HTML)
    ./replay        # replay engine
    ./react         # reusable React components
    ./cli           # programmatic CLI entry
    ./fixtures      # trace fixtures (moved from core/fixtures)
  bin:
    ocpp-debugkit   # CLI binary
```

### Subpath exports

Consumers import from `@ocpp-debugkit/toolkit/<module>` instead of
`@ocpp-debugkit/<module>`:

```ts
// Before
import { parseTrace } from '@ocpp-debugkit/core';
import { scenarios } from '@ocpp-debugkit/scenarios';
import { generateMarkdownReport } from '@ocpp-debugkit/reporter';

// After
import { parseTrace } from '@ocpp-debugkit/toolkit/core';
import { scenarios } from '@ocpp-debugkit/toolkit/scenarios';
import { generateMarkdownReport } from '@ocpp-debugkit/toolkit/reporter';
```

### Binary

The CLI binary name remains `ocpp-debugkit`. Consumers install one package and
get the CLI:

```bash
npm install -g @ocpp-debugkit/toolkit
ocpp-debugkit inspect trace.json
```

For `npx`:

```bash
npx ocpp-debugkit inspect trace.json
```

### Deprecation of old packages

The four old packages (`@ocpp-debugkit/core`, `@ocpp-debugkit/scenarios`,
`@ocpp-debugkit/reporter`, `@ocpp-debugkit/cli`) remain on npm with a
`deprecated` flag in their latest published versions. They will not receive new
features or bug fixes. A migration guide is provided at
[`docs/migration.md`](../migration.md).

### Single version

`@ocpp-debugkit/toolkit` is a single versioned unit. No more peer-dependency
mismatches — one version, one install, one release.

## Consequences

### Positive

- **Simpler installation.** One package to install: `npm install
  @ocpp-debugkit/toolkit`.
- **No version drift.** All modules share a single version. Mismatches are
  structurally impossible.
- **Faster releases.** One package, one publish, one changeset — instead of
  coordinated multi-package releases.
- **Cleaner dependency graph.** Internal modules depend on each other via
  TypeScript path aliases, not npm dependencies. The build is a single `tsc`
  pass.
- **Better tree-shaking.** Subpath exports let bundlers include only the
  modules a consumer actually imports. A consumer using only `core` doesn't pull
  in `react` or `cli`.
- **Module boundaries preserved.** The `core` / `scenarios` / `reporter` /
  `replay` / `react` / `cli` separation still exists as directories and export
  paths — the architectural boundary is intact, only the npm boundary is gone.

### Negative

- **Breaking change for existing consumers.** Anyone importing
  `@ocpp-debugkit/core` must update to `@ocpp-debugkit/toolkit/core`. The
  migration guide and deprecated old packages ease this.
- **Larger single package.** The npm tarball is larger, though consumers only
  pay for what they import at runtime via subpath exports and tree-shaking.
- **No independent versioning.** A bug fix to `reporter` bumps the version for
  all modules. Given the tight coupling, this is acceptable — a `reporter` fix
  often depends on a `core` change anyway.

### Neutral

- The old packages stay on npm indefinitely for backward compatibility, but
  they are deprecated and frozen.
