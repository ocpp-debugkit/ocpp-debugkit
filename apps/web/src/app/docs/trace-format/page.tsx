export default function TraceFormatPage() {
  return (
    <div>
      <h1>Trace Format</h1>
      <p>
        DebugKit accepts three trace formats. All formats use the OCPP 1.6 JSON message structure.
      </p>

      <h2>JSON Object Format</h2>
      <p>The primary format — a structured file with metadata and events:</p>
      <pre>
        <code>{`{
  "traceId": "trace-001",
  "metadata": {
    "stationId": "CS-SYNTHETIC-001",
    "ocppVersion": "1.6",
    "source": "csms-log"
  },
  "events": [
    {
      "timestamp": "2024-01-15T10:30:00.000Z",
      "direction": "CS_TO_CSMS",
      "message": [2, "msg-001", "BootNotification", {
        "chargePointVendor": "SyntheticVendor",
        "chargePointModel": "SM-100"
      }]
    },
    {
      "timestamp": "2024-01-15T10:30:00.500Z",
      "direction": "CSMS_TO_CS",
      "message": [3, "msg-001", {
        "currentTime": "2024-01-15T10:30:00.500Z",
        "status": "Accepted"
      }]
    }
  ]
}`}</code>
      </pre>

      <h2>JSONL Format</h2>
      <p>One event per line — useful for CSMS logs and streaming captures:</p>
      <pre>
        <code>{`{"timestamp":"2024-01-15T10:30:00.000Z","direction":"CS_TO_CSMS","message":[2,"msg-001","BootNotification",{}]}
{"timestamp":"2024-01-15T10:30:00.500Z","direction":"CSMS_TO_CS","message":[3,"msg-001",{"status":"Accepted"}]}`}</code>
      </pre>
      <p>Blank lines are ignored. Malformed lines produce parse warnings but don&apos;t fail.</p>

      <h2>Bare Array Format</h2>
      <p>A JSON array of raw OCPP messages — convenience for quick testing:</p>
      <pre>
        <code>{`[
  [2, "msg-001", "BootNotification", {}],
  [3, "msg-001", {"status": "Accepted"}]
]`}</code>
      </pre>
      <p>Direction is inferred; timestamps are null.</p>

      <h2>OCPP 1.6 JSON Message Structure</h2>
      <p>Three message types are supported:</p>
      <ul>
        <li>
          <strong>Call (2):</strong> <code>[2, UniqueId, Action, Payload]</code>
        </li>
        <li>
          <strong>CallResult (3):</strong> <code>[3, UniqueId, Payload]</code>
        </li>
        <li>
          <strong>CallError (4):</strong>{' '}
          <code>[4, UniqueId, ErrorCode, ErrorDescription, ErrorDetails]</code>
        </li>
      </ul>

      <h2>Timestamps</h2>
      <p>Accepted formats:</p>
      <ul>
        <li>
          ISO 8601 (UTC): <code>2024-01-15T10:30:00.000Z</code>
        </li>
        <li>
          ISO 8601 (offset): <code>2024-01-15T12:00:00+02:00</code>
        </li>
        <li>
          Unix epoch (ms): <code>1705312200000</code>
        </li>
        <li>
          Unix epoch (s): <code>1705312200</code>
        </li>
        <li>
          Missing/null — event timestamp is <code>null</code>
        </li>
      </ul>

      <h2>Limits</h2>
      <table>
        <thead>
          <tr>
            <th>Limit</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Maximum input size</td>
            <td>10 MB</td>
          </tr>
          <tr>
            <td>Maximum event count</td>
            <td>10,000</td>
          </tr>
        </tbody>
      </table>

      <h2>Direction Inference</h2>
      <p>When direction is not specified, it is inferred from the action name:</p>
      <ul>
        <li>
          <code>CS_TO_CSMS</code> — BootNotification, Authorize, StartTransaction, StopTransaction,
          StatusNotification, MeterValues, Heartbeat, etc.
        </li>
        <li>
          <code>CSMS_TO_CS</code> — Reset, RemoteStartTransaction, GetConfiguration,
          ChangeConfiguration, etc.
        </li>
        <li>
          <code>UNKNOWN</code> — unrecognized actions
        </li>
      </ul>
      <p>For CallResult/CallError, direction is inferred from the matching Call.</p>
    </div>
  );
}
