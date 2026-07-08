import Link from 'next/link';

export default function DocsPage() {
  return (
    <div>
      <h1>Documentation</h1>
      <p>
        Get started with OCPP DebugKit — open-source DevTools for debugging OCPP charging sessions.
      </p>
      <ul>
        <li>
          <Link href="/docs/quickstart">Quick Start</Link> — Install and run your first trace
          analysis
        </li>
        <li>
          <Link href="/docs/glossary">Glossary</Link> — OCPP terms explained
        </li>
        <li>
          <Link href="/docs/architecture">Architecture</Link> — Package structure and data flow
        </li>
        <li>
          <Link href="/docs/trace-format">Trace Format</Link> — Accepted input formats
        </li>
        <li>
          <Link href="/docs/cli">CLI Reference</Link> — Command-line interface
        </li>
        <li>
          <Link href="/docs/scenarios">Scenarios</Link> — Predefined test scenarios
        </li>
      </ul>
    </div>
  );
}
