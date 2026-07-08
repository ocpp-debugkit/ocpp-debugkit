export default function ScenariosPage() {
  return (
    <div>
      <h1>Scenarios</h1>
      <p>
        Scenarios are predefined trace fixtures that test the analysis engine. Each scenario has a
        trace and a list of expected failures.
      </p>

      <h2>Built-in Scenarios</h2>
      <p>DebugKit v0.1 includes 5 scenarios:</p>

      <h3>normal-session</h3>
      <p>
        A complete charging session: boot, authorize, start transaction, meter values, stop
        transaction. No failures expected.
      </p>
      <ul>
        <li>
          <code>expectedFailures: []</code>
        </li>
      </ul>

      <h3>failed-auth</h3>
      <p>
        Failed authorization: the idTag is rejected by the CSMS. StartTransaction is not attempted.
        The connector transitions to Faulted.
      </p>
      <ul>
        <li>
          <code>expectedFailures: [&quot;FAILED_AUTHORIZATION&quot;]</code>
        </li>
      </ul>

      <h3>connector-fault</h3>
      <p>
        Connector fault during an active session: the connector reports a Faulted status
        mid-charging, and the transaction stops with a fault reason.
      </p>
      <ul>
        <li>
          <code>expectedFailures: [&quot;CONNECTOR_FAULT&quot;]</code>
        </li>
      </ul>

      <h3>station-offline</h3>
      <p>
        Station goes offline during an active session: a StartTransaction is sent but no
        StopTransaction follows.
      </p>
      <ul>
        <li>
          <code>expectedFailures: [&quot;STATION_OFFLINE_DURING_SESSION&quot;]</code>
        </li>
      </ul>

      <h3>unexpected-stop-reason</h3>
      <p>
        A stop transaction with an unexpected stop reason. This is a parser/timeline-only fixture —
        no v0.1 detection rule matches it.
      </p>
      <ul>
        <li>
          <code>expectedFailures: []</code>
        </li>
      </ul>

      <h2>Failure Detection Rules</h2>
      <p>Three detection rules are available in v0.1:</p>
      <ul>
        <li>
          <strong>FAILED_AUTHORIZATION</strong> — Authorize response with
          <code>idTagInfo.status = &quot;Invalid&quot;</code>
        </li>
        <li>
          <strong>CONNECTOR_FAULT</strong> — StatusNotification with
          <code>status = &quot;Faulted&quot;</code> during an active session
        </li>
        <li>
          <strong>STATION_OFFLINE_DURING_SESSION</strong> — Session has StartTransaction but no
          StopTransaction, or connector transitions to Unavailable/Offline during an active
          transaction
        </li>
      </ul>

      <h2>Running Scenarios</h2>
      <pre>
        <code>{`# List all scenarios
ocpp-debugkit scenario list

# Run a specific scenario
ocpp-debugkit scenario run connector-fault`}</code>
      </pre>
      <p>The CLI reports detected vs expected failures and shows a pass/fail result.</p>

      <h2>Synthetic Data</h2>
      <p>
        All scenario data is fully synthetic. No real station identifiers, transaction IDs, idTag
        values, or personal data are used.
      </p>
    </div>
  );
}
