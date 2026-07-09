export default function ScenarioAssertionsPage() {
  return (
    <div>
      <h1>Scenario Assertions</h1>
      <p>
        Scenario assertions provide a declarative way to verify analysis results beyond simple
        failure-code matching. They allow you to assert event ordering, counts, payload fields,
        timing constraints, session state, and more.
      </p>

      <h2>Assertion Types</h2>
      <p>The following assertion types are available:</p>

      <h3>event_order</h3>
      <p>Verify that events appear in a specific order (not necessarily consecutive).</p>
      <pre>
        <code>{`{ type: 'event_order', params: { actions: ['BootNotification', 'Authorize', 'StartTransaction'] } }`}</code>
      </pre>

      <h3>event_count</h3>
      <p>Verify the count of events, optionally filtered by action.</p>
      <pre>
        <code>{`{ type: 'event_count', params: { min: 5, max: 20 } }
{ type: 'event_count', params: { min: 1, action: 'StartTransaction' } }`}</code>
      </pre>

      <h3>payload_field</h3>
      <p>
        Verify a payload field value on a specific action. Supports <code>equals</code> (deep
        equality) and <code>contains</code> (array/string contains).
      </p>
      <pre>
        <code>{`{ type: 'payload_field', params: { action: 'Authorize', field: 'idTag', equals: 'TAG-001' } }
{ type: 'payload_field', params: { action: 'StartTransaction', field: 'connectorId', equals: 1 } }`}</code>
      </pre>

      <h3>timing</h3>
      <p>
        Verify timing gaps between two actions. Uses <code>minGapMs</code> and/or{' '}
        <code>maxGapMs</code>.
      </p>
      <pre>
        <code>{`{ type: 'timing', params: { actionA: 'BootNotification', actionB: 'StartTransaction', maxGapMs: 5000 } }
{ type: 'timing', params: { actionA: 'BootNotification', actionB: 'Heartbeat', minGapMs: 5000 } }`}</code>
      </pre>

      <h3>session_state</h3>
      <p>Verify the session status (active, completed, or aborted).</p>
      <pre>
        <code>{`{ type: 'session_state', params: { expected: 'completed' } }`}</code>
      </pre>

      <h3>failure_severity</h3>
      <p>Verify that a specific failure has the expected severity.</p>
      <pre>
        <code>{`{ type: 'failure_severity', params: { code: 'UNRESPONSIVE_CSMS', severity: 'critical' } }`}</code>
      </pre>

      <h3>no_failures</h3>
      <p>Verify that no failures are detected.</p>
      <pre>
        <code>{`{ type: 'no_failures', params: {} }`}</code>
      </pre>

      <h3>failure_count</h3>
      <p>Verify the count of detected failures, optionally filtered by code.</p>
      <pre>
        <code>{`{ type: 'failure_count', params: { min: 1, max: 3 } }
{ type: 'failure_count', params: { code: 'FAILED_AUTHORIZATION', min: 1 } }`}</code>
      </pre>

      <h2>Using Assertions in Scenarios</h2>
      <p>
        Assertions are an optional field on the <code>Scenario</code> type. They are evaluated
        alongside <code>expectedFailures</code>:
      </p>
      <pre>
        <code>{`{
  name: 'my-scenario',
  description: 'Test scenario with assertions',
  trace: { /* ... */ },
  expectedFailures: ['FAILED_AUTHORIZATION'],
  assertions: [
    { type: 'event_order', params: { actions: ['BootNotification', 'Authorize'] } },
    { type: 'failure_count', params: { code: 'FAILED_AUTHORIZATION', min: 1, max: 1 } }
  ]
}`}</code>
      </pre>

      <h2>Programmatic API</h2>
      <pre>
        <code>{`import { evaluateScenario } from '@ocpp-debugkit/toolkit/core';

const result = evaluateScenario(scenario);
console.log(result.allPassed);           // true if all assertions + expectedFailures pass
console.log(result.assertions);          // AssertionResult[] with pass/fail per assertion
console.log(result.expectedFailuresPassed); // true if detected matches expected
console.log(result.detectedFailureCodes);   // detected failure codes`}</code>
      </pre>

      <h2>Backward Compatibility</h2>
      <p>
        Existing scenarios with only <code>expectedFailures</code> (no <code>assertions</code>{' '}
        field) continue to work unchanged. The <code>assertions</code> field is optional.
      </p>
    </div>
  );
}
