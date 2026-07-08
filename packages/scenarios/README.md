# @ocpp-debugkit/scenarios

> Predefined OCPP trace scenarios for testing the DebugKit analysis engine.

## Installation

```bash
npm install @ocpp-debugkit/scenarios
```

## Usage

```typescript
import { scenarios, getScenario } from '@ocpp-debugkit/scenarios';

// List all scenario names
scenarios.forEach(s => console.log(s.name, s.expectedFailures));

// Get a specific scenario
const scenario = getScenario('failed-auth');

// Run through the analysis engine
import { parseTrace, buildSessionTimeline, detectFailures } from '@ocpp-debugkit/core';

const result = parseTrace(JSON.stringify(scenario.trace));
const sessions = buildSessionTimeline(result.events);
const failures = detectFailures(result.events, sessions);
```

## Available Scenarios

| Name | Expected Failures |
|------|-------------------|
| `normal-session` | none |
| `failed-auth` | `FAILED_AUTHORIZATION` |
| `connector-fault` | `CONNECTOR_FAULT` |
| `station-offline` | `STATION_OFFLINE_DURING_SESSION` |
| `unexpected-stop-reason` | none (parser/timeline-only fixture) |

All scenario data is fully synthetic — no real station identifiers or personal data.

## License

Apache 2.0
