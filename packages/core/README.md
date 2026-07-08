# @ocpp-debugkit/core

> Core data model, parser, normalizer, timeline, and failure detection for OCPP DebugKit.

## Installation

```bash
npm install @ocpp-debugkit/core
```

## Usage

### Parse a trace

```typescript
import { parseTrace } from '@ocpp-debugkit/core';

const result = parseTrace(traceString);
// result.events — normalized Event[]
// result.warnings — ParseWarning[] for malformed entries
```

Accepts JSON Object, JSONL, and bare array formats.

### Build session timeline

```typescript
import { buildSessionTimeline } from '@ocpp-debugkit/core';

const sessions = buildSessionTimeline(result.events);
```

### Detect failures

```typescript
import { detectFailures } from '@ocpp-debugkit/core';

const failures = detectFailures(result.events, sessions);
// Three detection rules: FAILED_AUTHORIZATION, CONNECTOR_FAULT,
// STATION_OFFLINE_DURING_SESSION
```

### Generate summaries

```typescript
import { summarizeSessions } from '@ocpp-debugkit/core';

const summaries = summarizeSessions(sessions, failures);
```

### Validate messages

```typescript
import { validateMessage } from '@ocpp-debugkit/core';

const result = validateMessage(event);
// result.valid, result.errors
```

## Key Types

- `Event` — canonical normalized OCPP message
- `Session` — logical charging session
- `Failure` — detected failure with severity and suggested steps
- `Scenario` — predefined trace fixture with expected failures

## License

Apache 2.0
