export default function GlossaryPage() {
  return (
    <div>
      <h1>Glossary</h1>
      <p>Key OCPP and EV charging terms used throughout this project.</p>

      <h2>OCPP</h2>
      <p>
        Open Charge Point Protocol — the communication protocol between EV charging stations (Charge
        Points) and charging station management systems (CSMS). OCPP 1.6 JSON is the primary
        protocol supported by DebugKit.
      </p>

      <h2>Charge Point (CP)</h2>
      <p>
        The physical EV charging station. Also referred to as a &quot;station&quot;. Communicates
        with the CSMS via OCPP.
      </p>

      <h2>CSMS</h2>
      <p>
        Charging Station Management System — the central server that manages charging stations. Also
        referred to as &quot;the backend&quot;.
      </p>

      <h2>Connector</h2>
      <p>
        A physical charging outlet on a charging station. A station may have multiple connectors
        (e.g., connector 0 is typically the whole-station connector, connector 1+ are individual
        charging outlets).
      </p>

      <h2>Transaction</h2>
      <p>
        A single charging session, initiated by a StartTransaction request and terminated by a
        StopTransaction request. Each transaction has a unique transactionId assigned by the CSMS.
      </p>

      <h2>Call</h2>
      <p>
        An OCPP message type (MessageTypeId = 2) representing a request from one side to the other.
        Format: <code>[2, UniqueId, Action, Payload]</code>
      </p>

      <h2>CallResult</h2>
      <p>
        An OCPP message type (MessageTypeId = 3) representing a successful response to a Call.
        Format: <code>[3, UniqueId, Payload]</code>
      </p>

      <h2>CallError</h2>
      <p>
        An OCPP message type (MessageTypeId = 4) representing an error response to a Call. Format:{' '}
        <code>[4, UniqueId, ErrorCode, ErrorDescription, ErrorDetails]</code>
      </p>

      <h2>idTag</h2>
      <p>
        An identifier (typically an RFID card or app token) used to authorize a charging session.
        The CSMS validates the idTag and returns an authorization status (Accepted, Invalid, etc.).
      </p>

      <h2>Trace</h2>
      <p>
        A capture of OCPP messages exchanged between a Charge Point and CSMS over a period of time.
        Traces are the primary input to DebugKit.
      </p>

      <h2>Direction</h2>
      <p>
        The direction of an OCPP message: <code>CS_TO_CSMS</code> (station to backend),{' '}
        <code>CSMS_TO_CS</code> (backend to station), or
        <code>UNKNOWN</code>.
      </p>
    </div>
  );
}
