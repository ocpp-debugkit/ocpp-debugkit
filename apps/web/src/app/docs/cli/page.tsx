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
        <code>{`npm install -g @ocpp-debugkit/cli`}</code>
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
