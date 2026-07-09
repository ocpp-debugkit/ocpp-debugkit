export default function TraceDiffingPage() {
  return (
    <div>
      <h1>Trace Diffing</h1>
      <p>
        OCPP DebugKit can compare two parsed traces and surface differences at multiple levels:
        events, failures, and session summaries. This is useful for debugging regression issues,
        comparing good vs bad sessions, and tracking changes after fixes.
      </p>

      <h2>Programmatic API</h2>
      <pre>
        <code>{`import { parseTrace, diffTraces } from '@ocpp-debugkit/toolkit/core';

const resultA = parseTrace(traceAJson);
const resultB = parseTrace(traceBJson);
const diff = diffTraces(resultA, resultB);

console.log('Events only in A:', diff.onlyInA.length);
console.log('Events only in B:', diff.onlyInB.length);
console.log('Modified events:', diff.modified.length);
console.log('Failures only in A:', diff.failuresOnlyInA.map(f => f.code));
console.log('Failures only in B:', diff.failuresOnlyInB.map(f => f.code));
`}</code>
      </pre>

      <h2>TraceDiff Output</h2>
      <ul>
        <li>
          <code>onlyInA</code> / <code>onlyInB</code> — Events present in only one trace (by
          messageId)
        </li>
        <li>
          <code>modified</code> — Field-level differences for events in both (timestamp, direction,
          action, payload, errorCode)
        </li>
        <li>
          <code>failuresOnlyInA</code> / <code>failuresOnlyInB</code> — Failures detected in one but
          not the other
        </li>
        <li>
          <code>summaryDiff</code> — Session summary differences (event count, failure count,
          duration, status)
        </li>
      </ul>

      <h2>CLI Usage</h2>
      <pre>
        <code>{`ocpp-debugkit diff trace-a.json trace-b.json
ocpp-debugkit diff trace-a.json trace-b.json --format json`}</code>
      </pre>

      <h2>How Matching Works</h2>
      <p>
        Events are matched by their OCPP <code>messageId</code> (UniqueId). A Call and its
        CallResult share the same messageId — they are compared positionally within the same
        messageId group.
      </p>
      <p>
        Payloads are compared using deep equality. Any difference in nested fields is surfaced as a
        single <code>payload</code> modification.
      </p>
    </div>
  );
}
