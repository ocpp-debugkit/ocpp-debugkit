export default function QuickStartPage() {
  return (
    <div>
      <h1>Quick Start</h1>

      <h2>Install the CLI</h2>
      <pre>
        <code>{`npm install -g @ocpp-debugkit/toolkit`}</code>
      </pre>

      <h2>Inspect a trace</h2>
      <p>Parse and analyze an OCPP 1.6 JSON trace file:</p>
      <pre>
        <code>{`ocpp-debugkit inspect trace.json`}</code>
      </pre>
      <p>This outputs a summary with event count, sessions, and detected failures.</p>

      <h2>Generate a report</h2>
      <p>Generate a Markdown report from a trace:</p>
      <pre>
        <code>{`ocpp-debugkit report trace.json --output report.md`}</code>
      </pre>

      <h2>Run a scenario</h2>
      <p>Run a predefined scenario through the analysis engine:</p>
      <pre>
        <code>{`# List available scenarios
ocpp-debugkit scenario list

# Run a scenario
ocpp-debugkit scenario run failed-auth`}</code>
      </pre>

      <h2>Use the web inspector</h2>
      <p>
        No installation required — visit <a href="/inspector">the inspector</a> and paste a trace,
        upload a file, or select a sample scenario.
      </p>

      <h2>Use the core library</h2>
      <p>For programmatic use in your own TypeScript/JavaScript project:</p>
      <pre>
        <code>{`import { parseTrace, buildSessionTimeline, detectFailures } from '@ocpp-debugkit/toolkit/core';

const result = parseTrace(traceString);
const sessions = buildSessionTimeline(result.events);
const failures = detectFailures(result.events, sessions);

console.log(\`Found \${failures.length} failures\`);`}</code>
      </pre>
    </div>
  );
}
