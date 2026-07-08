# @ocpp-debugkit/toolkit

Open-source DevTools for debugging OCPP charging sessions.

## Installation

```bash
npm install @ocpp-debugkit/toolkit
```

## Usage

### Modular imports (recommended)

```ts
import { parseTrace, detectFailures, buildSessionTimeline } from '@ocpp-debugkit/toolkit/core';
import { builtInScenarios, getScenario } from '@ocpp-debugkit/toolkit/scenarios';
import { generateMarkdownReport } from '@ocpp-debugkit/toolkit/reporter';
import { ReplayEngine } from '@ocpp-debugkit/toolkit/replay';
import { SessionTimeline } from '@ocpp-debugkit/toolkit/react';
```

### CLI

```bash
npm install -g @ocpp-debugkit/toolkit
ocpp-debugkit inspect trace.json
ocpp-debugkit report trace.json
ocpp-debugkit scenario list
ocpp-debugkit scenario run normal-session
```

## License

Apache 2.0
