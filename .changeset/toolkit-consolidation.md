---
"@ocpp-debugkit/toolkit": minor
---

Consolidate four independent npm packages into a single `@ocpp-debugkit/toolkit` package with subpath exports.

Migrated `@ocpp-debugkit/core`, `@ocpp-debugkit/scenarios`, `@ocpp-debugkit/reporter`, and `@ocpp-debugkit/cli` into internal modules within `packages/toolkit/src/`. Added `src/replay/` and `src/react/` stub modules. Configured subpath exports (`/core`, `/scenarios`, `/reporter`, `/replay`, `/react`, `/cli`, `/fixtures`), ESM build with TypeScript declarations, tree-shaking (`sideEffects: false`), and CLI binary (`ocpp-debugkit`).

The old v0.1.1 packages remain on npm and will be deprecated with a migration message after `@ocpp-debugkit/toolkit@0.2.0` is published and verified.
