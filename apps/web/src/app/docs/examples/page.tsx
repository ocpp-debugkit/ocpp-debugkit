import Link from 'next/link';

export default function ExamplesPage() {
  return (
    <div>
      <h1>Examples</h1>
      <p>
        Integration examples showing how to use <code>@ocpp-debugkit/toolkit</code> in your
        projects. Each example is a standalone project in the <code>examples/</code> directory of
        the repository.
      </p>

      <h2>Available Examples</h2>
      <ul>
        <li>
          <strong>simple-trace</strong> — Parse a trace, detect failures, generate a Markdown
          report. Demonstrates the core analysis pipeline.
        </li>
        <li>
          <strong>simple-csms</strong> — Validate incoming traces (CSMS mock), check for failures.
          Demonstrates message validation.
        </li>
        <li>
          <strong>simulator-output</strong> — Process JSONL simulator output, generate an HTML
          report. Demonstrates JSONL parsing and HTML report generation.
        </li>
        <li>
          <strong>ci-example</strong> — Use <code>ocpp-debugkit ci</code> in GitHub Actions
          workflows. Demonstrates CI integration with scenario files.
        </li>
      </ul>

      <h2>Running Examples</h2>
      <p>Each example is standalone. Clone the repo and run:</p>
      <pre>
        <code>{`cd examples/simple-trace
npm install
npm start`}</code>
      </pre>

      <h2>Links</h2>
      <ul>
        <li>
          <Link href="/docs/quickstart">Quick Start</Link> — Get started with the toolkit
        </li>
        <li>
          <Link href="/docs/cli">CLI Reference</Link> — Full command reference
        </li>
        <li>
          <a href="https://github.com/ocpp-debugkit/ocpp-debugkit/tree/main/examples">
            Examples on GitHub
          </a>
        </li>
      </ul>
    </div>
  );
}
