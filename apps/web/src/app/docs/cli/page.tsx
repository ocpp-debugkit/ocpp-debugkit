export default function CliReferencePage() {
  return (
    <div>
      <h1>CLI Reference</h1>
      <p>
        The <code>ocpp-debugkit</code> CLI provides commands for inspecting traces, generating
        reports, and running scenarios.
      </p>

      <h2>Installation</h2>
      <pre>
        <code>{`npm install -g @ocpp-debugkit/toolkit`}</code>
      </pre>

      <h2>inspect</h2>
      <p>
        Parse and analyze an OCPP trace file. Outputs a summary with events, sessions, failures, and
        warnings.
      </p>
      <pre>
        <code>{`ocpp-debugkit inspect <file>`}</code>
      </pre>
      <p>Example:</p>
      <pre>
        <code>{`ocpp-debugkit inspect trace.json`}</code>
      </pre>

      <h2>report</h2>
      <p>Generate a Markdown report from an OCPP trace file.</p>
      <pre>
        <code>{`ocpp-debugkit report <file> [options]`}</code>
      </pre>
      <h3>Options</h3>
      <ul>
        <li>
          <code>-f, --format &lt;format&gt;</code> — Report format (default: markdown)
        </li>
        <li>
          <code>-o, --output &lt;file&gt;</code> — Write report to file (default: stdout)
        </li>
      </ul>
      <p>Example:</p>
      <pre>
        <code>{`ocpp-debugkit report trace.json --output report.md`}</code>
      </pre>

      <h2>scenario list</h2>
      <p>List all available built-in scenarios.</p>
      <pre>
        <code>{`ocpp-debugkit scenario list`}</code>
      </pre>

      <h2>scenario run</h2>
      <p>
        Run a built-in scenario through the analysis engine. Compares detected failures against
        expected failures and reports pass/fail.
      </p>
      <pre>
        <code>{`ocpp-debugkit scenario run <name>`}</code>
      </pre>
      <p>Example:</p>
      <pre>
        <code>{`ocpp-debugkit scenario run failed-auth`}</code>
      </pre>
      <p>
        <strong>Note:</strong> <code>scenario run</code> runs static fixtures through the local
        analysis engine only. It is not active endpoint testing, WebSocket simulation, or live
        station/CSMS testing.
      </p>
      <h3>External Scenario Files</h3>
      <p>Load and run an external scenario file (JSON format) instead of a built-in scenario:</p>
      <pre>
        <code>{`ocpp-debugkit scenario run --file ./my-scenario.json`}</code>
      </pre>

      <h2>ci</h2>
      <p>
        Run all built-in scenarios (and optional external scenario files from a directory), exit 0
        if all pass, 1 if any fail. Designed for CI/CD pipelines.
      </p>
      <pre>
        <code>{`ocpp-debugkit ci [dir] [options]`}</code>
      </pre>
      <h3>Options</h3>
      <ul>
        <li>
          <code>--format &lt;format&gt;</code> — Output format: text (default) or json
        </li>
      </ul>
      <p>Examples:</p>
      <pre>
        <code>{`# Run all built-in scenarios
ocpp-debugkit ci

# Also run external scenarios from a directory
ocpp-debugkit ci ./scenarios

# JSON output for CI tooling
ocpp-debugkit ci --format json`}</code>
      </pre>

      <h2>anonymize</h2>
      <p>
        Strip sensitive fields from a trace file. Anonymizes idTag, chargePointSerialNumber,
        stationId, transactionId, and email/phone/IP patterns.
      </p>
      <pre>
        <code>{`ocpp-debugkit anonymize <file> [options]`}</code>
      </pre>
      <h3>Options</h3>
      <ul>
        <li>
          <code>-o, --output &lt;file&gt;</code> — Write anonymized trace to file (default: stdout)
        </li>
      </ul>
      <p>Example:</p>
      <pre>
        <code>{`ocpp-debugkit anonymize trace.json -o trace-anon.json`}</code>
      </pre>

      <h2>diff</h2>
      <p>Compare two trace files and show differences in events, failures, and summaries.</p>
      <pre>
        <code>{`ocpp-debugkit diff <a> <b> [options]`}</code>
      </pre>
      <h3>Options</h3>
      <ul>
        <li>
          <code>--format &lt;format&gt;</code> — Output format: text (default) or json
        </li>
      </ul>
      <p>Example:</p>
      <pre>
        <code>{`ocpp-debugkit diff trace-a.json trace-b.json`}</code>
      </pre>

      <h2>Global Options</h2>
      <ul>
        <li>
          <code>-V, --version</code> — output the version number
        </li>
        <li>
          <code>-h, --help</code> — display help for any command
        </li>
      </ul>

      <h2>Security</h2>
      <ul>
        <li>File paths are validated before reading</li>
        <li>Input size limit: 10 MB</li>
        <li>Safe JSON parsing with error handling</li>
        <li>Non-sensitive error messages (no internal paths exposed)</li>
      </ul>
    </div>
  );
}
