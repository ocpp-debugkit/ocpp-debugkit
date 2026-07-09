# Migration Guide: Single Package Consolidation

> **Migrating from the old multi-package layout to the unified
> `@ocpp-debugkit/toolkit` package.**

OCPP DebugKit has consolidated four separate npm packages into a single
package, `@ocpp-debugkit/toolkit`, using subpath exports. This guide walks
through every change you need to make.

## Summary

| Old package | New import path |
|-------------|-----------------|
| `@ocpp-debugkit/core` | `@ocpp-debugkit/toolkit/core` |
| `@ocpp-debugkit/scenarios` | `@ocpp-debugkit/toolkit/scenarios` |
| `@ocpp-debugkit/reporter` | `@ocpp-debugkit/toolkit/reporter` |
| `@ocpp-debugkit/cli` | `@ocpp-debugkit/toolkit/cli` (programmatic) or `npx ocpp-debugkit` (CLI) |
| `@ocpp-debugkit/replay` | `@ocpp-debugkit/toolkit/replay` |
| `@ocpp-debugkit/react` | `@ocpp-debugkit/toolkit/react` |
| `@ocpp-debugkit/core/fixtures` | `@ocpp-debugkit/toolkit/fixtures` |

The old packages remain on npm under the `@ocpp-debugkit` scope, but they are
**deprecated** and will no longer receive updates. New features and bug fixes
ship only in `@ocpp-debugkit/toolkit`.

## Installation

### Before

```bash
npm install @ocpp-debugkit/core @ocpp-debugkit/scenarios @ocpp-debugkit/reporter
```

### After

```bash
npm install @ocpp-debugkit/toolkit
```

That single dependency gives you access to every module via subpath exports.

## Import Migration

### Core (data model, parser, normalizer, timeline, failure detection)

**Before:**

```ts
import {
  parseTrace,
  normalizeEvents,
  buildTimeline,
  detectFailures,
  type Event,
  type Session,
} from '@ocpp-debugkit/core';
```

**After:**

```ts
import {
  parseTrace,
  normalizeEvents,
  buildTimeline,
  detectFailures,
  type Event,
  type Session,
} from '@ocpp-debugkit/toolkit/core';
```

### Scenarios

**Before:**

```ts
import { scenarios, getScenario } from '@ocpp-debugkit/scenarios';
```

**After:**

```ts
import { scenarios, getScenario } from '@ocpp-debugkit/toolkit/scenarios';
```

### Reporter

**Before:**

```ts
import { generateMarkdownReport } from '@ocpp-debugkit/reporter';
```

**After:**

```ts
import { generateMarkdownReport } from '@ocpp-debugkit/toolkit/reporter';
```

### Replay

**Before:**

```ts
import { createReplayEngine } from '@ocpp-debugkit/replay';
```

**After:**

```ts
import { createReplayEngine } from '@ocpp-debugkit/toolkit/replay';
```

### React Components

**Before:**

```ts
import { TimelineView, MessageInspector } from '@ocpp-debugkit/react';
```

**After:**

```ts
import { TimelineView, MessageInspector } from '@ocpp-debugkit/toolkit/react';
```

## Fixture Imports

Trace fixtures previously lived under `@ocpp-debugkit/core/fixtures`. They have
moved to `@ocpp-debugkit/toolkit/fixtures`.

**Before:**

```ts
import { failedAuthTrace } from '@ocpp-debugkit/core/fixtures';
```

**After:**

```ts
import { failedAuthTrace } from '@ocpp-debugkit/toolkit/fixtures';
```

## CLI Migration

### Installed CLI

**Before:**

```bash
npm install -g @ocpp-debugkit/cli
ocpp-debugkit inspect trace.json
```

**After:**

```bash
npm install -g @ocpp-debugkit/toolkit
ocpp-debugkit inspect trace.json
```

The binary name stays `ocpp-debugkit` — only the npm package name changes.

### npx (no global install)

**Before:**

```bash
npx @ocpp-debugkit/cli inspect trace.json
```

**After:**

```bash
npx ocpp-debugkit inspect trace.json
```

`npx ocpp-debugkit` resolves the `bin` entry from `@ocpp-debugkit/toolkit`
automatically. All subcommands (`inspect`, `report`, `scenario list`,
`scenario run`) work identically.

### Programmatic CLI import

If you imported the CLI programmatically (e.g., to invoke it from a Node.js
script):

**Before:**

```ts
import { runCli } from '@ocpp-debugkit/cli';
```

**After:**

```ts
import { runCli } from '@ocpp-debugkit/toolkit/cli';
```

## Codemod (Optional)

A find-and-replace across your codebase handles most migrations:

```bash
# Import paths
npx replace-in-file '@ocpp-debugkit/core/fixtures' '@ocpp-debugkit/toolkit/fixtures' 'src/**/*.ts'
npx replace-in-file '@ocpp-debugkit/core' '@ocpp-debugkit/toolkit/core' 'src/**/*.ts'
npx replace-in-file '@ocpp-debugkit/scenarios' '@ocpp-debugkit/toolkit/scenarios' 'src/**/*.ts'
npx replace-in-file '@ocpp-debugkit/reporter' '@ocpp-debugkit/toolkit/reporter' 'src/**/*.ts'
npx replace-in-file '@ocpp-debugkit/replay' '@ocpp-debugkit/toolkit/replay' 'src/**/*.ts'
npx replace-in-file '@ocpp-debugkit/react' '@ocpp-debugkit/toolkit/react' 'src/**/*.ts'
npx replace-in-file '@ocpp-debugkit/cli' '@ocpp-debugkit/toolkit/cli' 'src/**/*.ts'

# CLI invocations
npx replace-in-file 'npx @ocpp-debugkit/cli' 'npx ocpp-debugkit' 'src/**/*.ts'
```

> **Order matters.** Replace `/fixtures` first so it doesn't get swallowed by
> the broader `/core` replacement.

After running, update your `package.json` dependencies — remove the old
`@ocpp-debugkit/*` entries and add `@ocpp-debugkit/toolkit`.

## Deprecation Policy

The four old packages (`@ocpp-debugkit/core`, `@ocpp-debugkit/scenarios`,
`@ocpp-debugkit/reporter`, `@ocpp-debugkit/cli`) remain on npm so existing
installs don't break. Their latest versions carry a `deprecated` flag pointing
to this guide. They will **not** receive new features or bug fixes.

We recommend migrating to `@ocpp-debugkit/toolkit` at your earliest
convenience.

## Questions

- Open a [GitHub Issue](https://github.com/ocpp-debugkit/toolkit/issues)
- Read the [ADR](./adr/0010-single-package-consolidation.md) for the rationale
  behind this consolidation
