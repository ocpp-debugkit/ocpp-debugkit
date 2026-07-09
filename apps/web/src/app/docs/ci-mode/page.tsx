export default function CiModePage() {
  return (
    <div>
      <h1>CI Mode</h1>
      <p>
        The <code>ocpp-debugkit ci</code> command runs all built-in scenarios (and optional external
        scenario files) and exits with code 0 if all pass, 1 if any fail. This is designed for
        integration into CI/CD pipelines.
      </p>

      <h2>Basic Usage</h2>
      <pre>
        <code>{`# Run all built-in scenarios
ocpp-debugkit ci

# Also run external scenarios from a directory
ocpp-debugkit ci ./scenarios

# JSON output for CI tooling
ocpp-debugkit ci --format json`}</code>
      </pre>

      <h2>GitHub Actions Integration</h2>
      <p>Add the following step to your workflow:</p>
      <pre>
        <code>{`- name: Run OCPP scenario tests
  run: ocpp-debugkit ci --format json`}</code>
      </pre>
      <p>
        The command exits 0 (pass) or 1 (fail). The JSON output can be parsed for dashboards or
        notifications.
      </p>

      <h2>External Scenario Files</h2>
      <p>
        Create JSON scenario files in a directory and pass the directory path to the <code>ci</code>{' '}
        command:
      </p>
      <pre>
        <code>{`ocpp-debugkit ci ./scenarios`}</code>
      </pre>
      <p>Scenario file format:</p>
      <pre>
        <code>{`{
  "name": "my-scenario",
  "description": "Custom scenario for CI testing",
  "trace": { ... },
  "expectedFailures": ["FAILED_AUTHORIZATION"],
  "assertions": [
    { "type": "event_order", "params": { "actions": ["BootNotification", "Authorize"] } }
  ]
}`}</code>
      </pre>

      <h2>JSON Output Format</h2>
      <pre>
        <code>{`{
  "results": [
    {
      "name": "normal-session",
      "passed": true,
      "detectedFailures": [],
      "expectedFailures": [],
      "assertionResults": []
    },
    ...
  ],
  "allPassed": true
}`}</code>
      </pre>

      <h2>Example Workflow</h2>
      <p>
        See the <code>examples/ci-example/</code> directory for a complete GitHub Actions workflow
        with scenario files.
      </p>
    </div>
  );
}
