export default function AnonymizePage() {
  return (
    <div>
      <h1>Anonymize</h1>
      <p>
        The <code>ocpp-debugkit anonymize</code> command strips sensitive fields from a trace file,
        making it safe to share for debugging or support purposes.
      </p>

      <h2>Usage</h2>
      <pre>
        <code>{`# Output to stdout
ocpp-debugkit anonymize trace.json

# Write to file
ocpp-debugkit anonymize trace.json -o trace-anon.json`}</code>
      </pre>

      <h2>What Gets Anonymized</h2>
      <ul>
        <li>
          <code>idTag</code> — replaced with <code>&quot;anonymized&quot;</code>
        </li>
        <li>
          <code>chargePointSerialNumber</code> / <code>chargeBoxSerialNumber</code> — replaced with{' '}
          <code>&quot;station-anon&quot;</code>
        </li>
        <li>
          <code>stationId</code> — replaced with <code>&quot;station-anon&quot;</code>
        </li>
        <li>
          <code>transactionId</code> — replaced with sequential integers (1, 2, 3...)
        </li>
        <li>
          <code>identifier</code> — replaced with <code>&quot;anonymized&quot;</code>
        </li>
        <li>
          Email addresses — replaced with <code>[redacted-email]</code>
        </li>
        <li>
          Phone numbers — replaced with <code>[redacted-phone]</code>
        </li>
        <li>
          IP addresses — replaced with <code>[redacted-ip]</code>
        </li>
      </ul>

      <h2>Privacy Considerations</h2>
      <p>
        Anonymization is performed locally — no data is uploaded. The anonymized trace is safe to
        share in issue reports, support tickets, or public forums.
      </p>
      <p>
        <strong>Note:</strong> Anonymization is a best-effort process. Always review the output
        before sharing to ensure no sensitive data remains.
      </p>

      <h2>What Is NOT Anonymized</h2>
      <ul>
        <li>Timestamps — preserved for debugging timeline issues</li>
        <li>OCPP action names — preserved for structural understanding</li>
        <li>Meter values — preserved for analysis (they don&apos;t identify users)</li>
        <li>Error codes and descriptions — preserved for debugging</li>
      </ul>
    </div>
  );
}
