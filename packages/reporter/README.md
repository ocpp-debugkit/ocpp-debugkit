# @ocpp-debugkit/reporter

> Report generators for OCPP DebugKit analysis results.

## Installation

```bash
npm install @ocpp-debugkit/reporter
```

## Usage

### Generate a Markdown report

```typescript
import { generateMarkdownReport } from '@ocpp-debugkit/reporter';
import type { AnalysisResult } from '@ocpp-debugkit/reporter';

const report = generateMarkdownReport({
  events,
  sessions,
  failures,
  summaries,
  warnings,
});

// report is a Markdown string with:
// - Session overview table
// - Timeline summary (action sequences)
// - Failures (severity, description, suggested steps)
// - Suggested next steps
// - Raw event appendix
```

## Input Type

```typescript
interface AnalysisResult {
  events: Event[];
  sessions: Session[];
  failures: Failure[];
  summaries: SessionSummary[];
  warnings: ParseWarning[];
  metadata?: TraceMetadata;
}
```

## License

Apache 2.0
