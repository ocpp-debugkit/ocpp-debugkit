export default function ArchitecturePage() {
  return (
    <div>
      <h1>Architecture</h1>
      <p>
        OCPP DebugKit is a modular monorepo with independent packages. Each package can be used
        standalone or together.
      </p>

      <h2>Package Structure</h2>
      <pre>
        <code>{`ocpp-debugkit/
├── packages/
│   ├── core/          # Data model, parser, normalizer, timeline, failure detection
│   ├── scenarios/     # Predefined trace scenarios for testing
│   ├── reporter/      # Report generators (Markdown)
│   ├── cli/           # Command-line interface
│   ├── replay/        # Replay engine (v0.2+)
│   └── react/         # Reusable React components (v0.2+)
├── apps/
│   └── web/           # Single Next.js app (landing, inspector, docs)
└── turbo.json          # Turborepo task pipeline`}</code>
      </pre>

      <h2>Dependency Graph</h2>
      <pre>
        <code>{`        core          ← everything depends on this
       /  |  \\
  scenarios | reporter
       \\  |  /
          cli
          |
       apps/web`}</code>
      </pre>

      <h2>Build Order</h2>
      <p>Packages must be built in dependency order: core → scenarios/reporter → cli → app</p>

      <h2>Data Flow</h2>
      <p>The analysis pipeline processes traces in three stages:</p>
      <ol>
        <li>
          <strong>Parse</strong> — <code>parseTrace()</code> accepts JSON Object, JSONL, or bare
          array input, validates with Zod schemas, and produces normalized <code>Event</code>{' '}
          objects.
        </li>
        <li>
          <strong>Analyze</strong> — <code>buildSessionTimeline()</code> groups events into
          sessions, then <code>detectFailures()</code> checks for known failure patterns (failed
          auth, connector fault, station offline).
        </li>
        <li>
          <strong>Report</strong> — <code>generateMarkdownReport()</code> produces a human-readable
          Markdown report with session overview, timeline, failures, and suggested steps.
        </li>
      </ol>

      <h2>Browser-Local Processing</h2>
      <p>
        All trace processing in the web inspector happens client-side. No trace data is uploaded to
        any server. The CSMS/CLI process traces locally.
      </p>

      <h2>Technology Stack</h2>
      <ul>
        <li>TypeScript (strict mode)</li>
        <li>Zod for input validation</li>
        <li>Vitest for testing</li>
        <li>Turborepo for build orchestration</li>
        <li>Next.js + Tailwind CSS for the web app</li>
        <li>Commander for the CLI</li>
        <li>Playwright for E2E tests</li>
      </ul>
    </div>
  );
}
