# @ocpp-debugkit/toolkit

Open-source DevTools for debugging OCPP (Open Charge Point Protocol) charging
sessions — trace parser, failure detection, scenario evaluator, replay engine,
report generation, React components, and CLI.

## Features

- **Trace Parser** — Parse OCPP 1.6 JSON traces in JSON Object, JSONL, or bare
  array format. Safe parsing with size and event-count limits.
- **Failure Detection** — 10 detection rules covering common failure patterns
  (failed authorization, connector faults, station offline, heartbeat timeout,
  meter value gaps, invalid stop reasons, status transition violations,
  diagnostics failures, firmware update failures, unexpected starts).
- **Scenario Evaluator** — 10 predefined scenarios with expected failure
  outcomes for testing the analysis engine. Supports external scenario files.
- **Replay Engine** — Deterministic, pure replay engine with step forward/back,
  jump-to-event, and configurable playback speed. No timers or I/O.
- **Report Generation** — Markdown and HTML report generators with session
  overview, timeline, failures, and suggested steps.
- **React Components** — Reusable, SSR-safe presentational components:
  SessionTimeline, MessageInspector, FailureSummary, ReportViewer,
  ReplayControls.
- **CLI** — Command-line interface for inspecting traces, generating reports,
  and running scenarios.
- **Browser-Safe** — Core, scenarios, reporter, replay, and react modules have
  no Node.js built-in dependencies. All trace processing can run client-side.

## Installation

```bash
npm install @ocpp-debugkit/toolkit
# or
pnpm add @ocpp-debugkit/toolkit
# or
yarn add @ocpp-debugkit/toolkit
```

For the CLI, install globally:

```bash
npm install -g @ocpp-debugkit/toolkit
```

## Subpath Exports

| Import path | Description | Browser-safe |
|-------------|-------------|:------------:|
| `@ocpp-debugkit/toolkit` | Root barrel — most common core functions | ✅ |
| `@ocpp-debugkit/toolkit/core` | Data model, parser, normalizer, timeline, failure detection, validator, summarizer | ✅ |
| `@ocpp-debugkit/toolkit/scenarios` | Predefined trace scenarios and registry | ✅ |
| `@ocpp-debugkit/toolkit/reporter` | Markdown and HTML report generators | ✅ |
| `@ocpp-debugkit/toolkit/replay` | Deterministic replay engine | ✅ |
| `@ocpp-debugkit/toolkit/react` | Reusable React components (peer dep: `react`) | ✅ |
| `@ocpp-debugkit/toolkit/cli` | Programmatic CLI entry (Node-only, has shebang) | ❌ |
| `@ocpp-debugkit/toolkit/fixtures` | Trace fixtures for testing | ✅ |

## Programmatic Usage

### Core — Parse, Detect, Analyze

```typescript
import {
  parseTrace,
  detectFailures,
  buildSessionTimeline,
  summarizeSession,
  validateMessage,
} from '@ocpp-debugkit/toolkit/core';

// Parse a trace from JSON string, JSONL, or bare array
const { events, warnings } = parseTrace(jsonString);

// Build session timeline (correlates events by transactionId)
const sessions = buildSessionTimeline(events);

// Detect failures across all sessions
const failures = detectFailures(events, sessions);

// Summarize a session
const summary = summarizeSession(sessions[0]);

// Validate a single OCPP message
const result = validateMessage(events[0]);
// → { valid: boolean, errors: string[] }
```

### Scenarios — Predefined Test Cases

```typescript
import { scenarios, getScenario, scenarioNames } from '@ocpp-debugkit/toolkit/scenarios';

// List all scenario names
console.log(scenarioNames);
// → ['normal-session', 'failed-auth', 'connector-fault', ...]

// Get a specific scenario
const scenario = getScenario('failed-auth');
// → { name, description, trace, expectedFailures }

// Run through the analysis engine
const { events } = parseTrace(JSON.stringify(scenario.trace));
const sessions = buildSessionTimeline(events);
const failures = detectFailures(events, sessions);

// Compare detected vs expected
const detected = failures.map((f) => f.code);
const passed = JSON.stringify(detected.sort()) === JSON.stringify(scenario.expectedFailures.sort());
```

### Reporter — Markdown and HTML Reports

```typescript
import { generateMarkdownReport, generateHtmlReport } from '@ocpp-debugkit/toolkit/reporter';
import type { AnalysisResult } from '@ocpp-debugkit/toolkit/reporter';

const analysis: AnalysisResult = {
  events,
  sessions,
  failures,
  summaries: sessions.map(summarizeSession),
  warnings,
};

// Generate Markdown report
const markdown = generateMarkdownReport(analysis);

// Generate self-contained HTML report (inline CSS, no external deps)
const html = generateHtmlReport(analysis);
```

### Replay — Deterministic Event Replay

```typescript
import { ReplayEngine } from '@ocpp-debugkit/toolkit/replay';

const engine = new ReplayEngine(events, failures, { startIndex: 0 });

// Step forward
const next = engine.step();
// → { event: Event, failures: Failure[], index: number } | null

// Step back
const prev = engine.stepBack();

// Jump to a specific event
const state = engine.jumpTo(5);

// Check state
engine.totalEvents;  // total event count
engine.current;      // current index (0-based, -1 if no events)
state.complete;      // true if all events replayed
```

### React Components — Reusable UI

> **Peer dependencies:** `react` and `react-dom` (v18 or v19) must be installed
> separately. They are optional peer deps — only required if you use
> `@ocpp-debugkit/toolkit/react`.

```typescript
import {
  SessionTimeline,
  MessageInspector,
  FailureSummary,
  ReportViewer,
  ReplayControls,
} from '@ocpp-debugkit/toolkit/react';

// Timeline with click-to-inspect
<SessionTimeline
  events={events}
  selectedEventId={selectedId}
  onSelectEvent={(id) => setSelectedId(id)}
/>

// Message detail panel
<MessageInspector event={selectedEvent} />

// Failure summary with severity and suggested steps
<FailureSummary failures={failures} />

// HTML report viewer (renders via srcdoc iframe — no dangerouslySetInnerHTML)
<ReportViewer html={htmlReport} />

// Replay playback controls
<ReplayControls
  isPlaying={isPlaying}
  currentIndex={engine.current}
  totalEvents={engine.totalEvents}
  onPlay={() => setPlaying(true)}
  onPause={() => setPlaying(false)}
  onStep={() => engine.step()}
  onStepBack={() => engine.stepBack()}
  onJump={(i) => engine.jumpTo(i)}
  speed={1}
  onSpeedChange={(s) => setSpeed(s)}
/>
```

### Fixtures — Synthetic Test Data

```typescript
import { fixtures, fixtureNames } from '@ocpp-debugkit/toolkit/fixtures';

// Available fixtures: 'normal-session', 'failed-auth', 'connector-fault'
const trace = fixtures.normalSession;
```

## CLI

```bash
# Parse and analyze a trace file
ocpp-debugkit inspect trace.json
ocpp-debugkit inspect trace.json --format text

# Generate a report
ocpp-debugkit report trace.json
ocpp-debugkit report trace.json --format markdown --output report.md
ocpp-debugkit report trace.json --format html --output report.html

# List all predefined scenarios
ocpp-debugkit scenario list

# Run a built-in scenario through the analysis engine
ocpp-debugkit scenario run failed-auth

# Run an external scenario file
ocpp-debugkit scenario run --file ./my-scenario.json
```

## Trace Formats

The parser accepts three input formats:

1. **JSON Object** — `{ "traceId": "...", "metadata": {...}, "events": [...] }`
2. **JSONL** — One event per line: `{ "timestamp": "...", "message": [...] }`
3. **Bare Array** — `[{ "timestamp": "...", "message": [...] }, ...]`

Each event has a `message` field containing a raw OCPP 1.6 JSON array:
- **Call:** `[2, "UniqueId", "Action", { ...payload }]`
- **CallResult:** `[3, "UniqueId", { ...payload }]`
- **CallError:** `[4, "UniqueId", "ErrorCode", "ErrorDescription", {}]`

See the [trace format specification](https://github.com/ocpp-debugkit/ocpp-debugkit/blob/main/docs/trace-format-spec.md) for full details.

## Links

- [GitHub repository](https://github.com/ocpp-debugkit/ocpp-debugkit)
- [Documentation](https://ocppdebugkit.com/docs)
- [Migration guide (v0.1 → v0.2)](https://github.com/ocpp-debugkit/ocpp-debugkit/blob/main/docs/migration.md)
- [Issue tracker](https://github.com/ocpp-debugkit/ocpp-debugkit/issues)
- [npm package](https://www.npmjs.com/package/@ocpp-debugkit/toolkit)

## License

Apache License 2.0 — see [LICENSE](https://github.com/ocpp-debugkit/ocpp-debugkit/blob/main/LICENSE).
