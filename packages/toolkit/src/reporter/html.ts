/**
 * HTML report generator — produces a self-contained, human-readable HTML
 * document from an AnalysisResult.
 *
 * Sections:
 * 1. Session overview (station ID, connector, duration, status)
 * 2. Timeline summary (event count, action sequence)
 * 3. Failures (severity, description, suggested steps)
 * 4. Suggested next steps
 * 5. Raw event appendix (compact)
 *
 * All user-supplied content (event payloads, descriptions, metadata) is
 * HTML-escaped via {@link escapeHtml} to prevent injection / XSS.
 */

import type { AnalysisResult } from './types.js';
import type { Event } from '../core/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Escape HTML special characters in a string to prevent XSS. */
function escapeHtml(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Format a duration in milliseconds as a human-readable string. */
function formatDuration(ms: number | null): string {
  if (ms === null) return 'Unknown';
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

/** Format an epoch millisecond timestamp as ISO 8601. */
function formatTimestamp(ms: number | null): string {
  if (ms === null) return 'Unknown';
  return new Date(ms).toISOString();
}

/** Get severity badge class for a failure. */
function severityClass(severity: string): string {
  switch (severity) {
    case 'critical':
      return 'severity-critical';
    case 'warning':
      return 'severity-warning';
    case 'info':
      return 'severity-info';
    default:
      return 'severity-default';
  }
}

/** Get severity emoji for a failure. */
function severityEmoji(severity: string): string {
  switch (severity) {
    case 'critical':
      return '🔴';
    case 'warning':
      return '🟡';
    case 'info':
      return '🔵';
    default:
      return '⚪';
  }
}

// ---------------------------------------------------------------------------
// CSS theme (dark)
// ---------------------------------------------------------------------------

const CSS = `
  :root {
    color-scheme: dark;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    background: #0d1117;
    color: #c9d1d9;
    margin: 0;
    padding: 2rem 1rem;
    line-height: 1.6;
  }
  .container {
    max-width: 960px;
    margin: 0 auto;
  }
  h1 {
    color: #f0f6fc;
    border-bottom: 1px solid #30363d;
    padding-bottom: 0.5rem;
  }
  h2 {
    color: #58a6ff;
    margin-top: 2.5rem;
    border-bottom: 1px solid #21262d;
    padding-bottom: 0.3rem;
  }
  h3 {
    color: #d2a8ff;
    margin-top: 1.5rem;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 1rem 0;
    font-size: 0.875rem;
  }
  th, td {
    border: 1px solid #30363d;
    padding: 0.5rem 0.75rem;
    text-align: left;
  }
  th {
    background: #161b22;
    color: #f0f6fc;
  }
  tr:nth-child(even) {
    background: #161b22;
  }
  code {
    background: #161b22;
    padding: 0.15rem 0.4rem;
    border-radius: 4px;
    font-size: 0.85em;
  }
  .header-meta {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 0.25rem 1rem;
    margin: 1rem 0;
  }
  .header-meta dt {
    color: #8b949e;
    font-weight: 600;
  }
  .stats {
    display: flex;
    gap: 1.5rem;
    flex-wrap: wrap;
    margin: 1rem 0;
  }
  .stat {
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 6px;
    padding: 0.75rem 1.25rem;
    text-align: center;
  }
  .stat .stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: #f0f6fc;
  }
  .stat .stat-label {
    color: #8b949e;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .failure {
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 6px;
    padding: 1rem 1.25rem;
    margin: 1rem 0;
  }
  .severity-badge {
    display: inline-block;
    padding: 0.15rem 0.5rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
  }
  .severity-critical { background: #da3633; color: #fff; }
  .severity-warning { background: #d29922; color: #1a1a1a; }
  .severity-info { background: #1f6feb; color: #fff; }
  .severity-default { background: #30363d; color: #c9d1d9; }
  .ok-message {
    color: #3fb950;
    font-style: italic;
  }
  ol, ul { padding-left: 1.5rem; }
  .event-id { color: #8b949e; font-family: monospace; }
  footer {
    color: #8b949e;
    font-size: 0.8rem;
    margin-top: 3rem;
    padding-top: 1rem;
    border-top: 1px solid #21262d;
  }
`;

// ---------------------------------------------------------------------------
// Section generators
// ---------------------------------------------------------------------------

function generateHead(): string {
  return `<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OCPP DebugKit — Trace Analysis Report</title>
  <style>${CSS}</style>
</head>`;
}

function generateHeader(result: AnalysisResult): string {
  const parts: string[] = ['<h1>OCPP DebugKit — Trace Analysis Report</h1>'];

  // Metadata
  if (result.metadata) {
    const m = result.metadata;
    const metaRows: string[] = [];
    if (m.stationId) {
      metaRows.push(`<dt>Station</dt><dd>${escapeHtml(m.stationId)}</dd>`);
    }
    if (m.ocppVersion) {
      metaRows.push(`<dt>OCPP Version</dt><dd>${escapeHtml(m.ocppVersion)}</dd>`);
    }
    if (m.source) {
      metaRows.push(`<dt>Source</dt><dd>${escapeHtml(m.source)}</dd>`);
    }
    if (m.description) {
      metaRows.push(`<dt>Description</dt><dd>${escapeHtml(m.description)}</dd>`);
    }
    if (metaRows.length > 0) {
      parts.push(`<dl class="header-meta">${metaRows.join('')}</dl>`);
    }
  }

  // Stats
  const stats = [
    { label: 'Events', value: result.events.length },
    { label: 'Sessions', value: result.sessions.length },
    { label: 'Failures', value: result.failures.length },
    { label: 'Warnings', value: result.warnings.length },
  ];
  const statHtml = stats
    .map(
      (s) =>
        `<div class="stat"><div class="stat-value">${escapeHtml(s.value)}</div><div class="stat-label">${escapeHtml(s.label)}</div></div>`,
    )
    .join('');
  parts.push(`<div class="stats">${statHtml}</div>`);

  // Parse warnings
  if (result.warnings.length > 0) {
    const items = result.warnings.map((w) => `<li>${escapeHtml(w.message)}</li>`).join('');
    parts.push(`<h2>Parse Warnings</h2><ul>${items}</ul>`);
  }

  return parts.join('\n');
}

function generateSessionOverview(result: AnalysisResult): string {
  if (result.sessions.length === 0) {
    return '<h2>Session Overview</h2><p>No sessions detected.</p>';
  }

  const rows = result.sessions
    .map((session) => {
      const summary = result.summaries.find((s) => s.sessionId === session.sessionId);
      const duration = summary?.durationMs ?? null;
      return `<tr>
  <td>${escapeHtml(session.sessionId)}</td>
  <td>${escapeHtml(session.stationId)}</td>
  <td>${escapeHtml(session.connectorId ?? '-')}</td>
  <td>${escapeHtml(session.transactionId ?? '-')}</td>
  <td>${escapeHtml(formatTimestamp(session.startTime))}</td>
  <td>${escapeHtml(formatTimestamp(session.endTime))}</td>
  <td>${escapeHtml(formatDuration(duration))}</td>
  <td>${escapeHtml(session.status)}</td>
</tr>`;
    })
    .join('\n');

  return `<h2>Session Overview</h2>
<table>
  <thead><tr><th>Session</th><th>Station</th><th>Connector</th><th>Transaction</th><th>Start</th><th>End</th><th>Duration</th><th>Status</th></tr></thead>
  <tbody>
${rows}
  </tbody>
</table>`;
}

function generateTimelineSummary(result: AnalysisResult): string {
  if (result.summaries.length === 0) {
    return '<h2>Timeline Summary</h2><p>No sessions to summarize.</p>';
  }

  const blocks = result.summaries
    .map((summary) => {
      const actionSequence = escapeHtml(summary.actionSequence.join(' → ')) || 'None';
      return `<h3>${escapeHtml(summary.sessionId)}</h3>
<ul>
  <li><strong>Events:</strong> ${escapeHtml(summary.eventCount)}</li>
  <li><strong>Duration:</strong> ${escapeHtml(formatDuration(summary.durationMs))}</li>
  <li><strong>Failures:</strong> ${escapeHtml(summary.failureCount)}</li>
  <li><strong>Action Sequence:</strong> ${actionSequence}</li>
</ul>`;
    })
    .join('\n');

  return `<h2>Timeline Summary</h2>\n${blocks}`;
}

function generateFailures(result: AnalysisResult): string {
  if (result.failures.length === 0) {
    return '<h2>Failures</h2><p class="ok-message">No failures detected. ✅</p>';
  }

  const blocks = result.failures
    .map((failure) => {
      const stepsItems = failure.suggestedSteps
        .map((step) => `<li>${escapeHtml(step)}</li>`)
        .join('\n');
      const eventIds = failure.eventIds
        .map((id) => `<span class="event-id">${escapeHtml(id)}</span>`)
        .join(', ');
      return `<div class="failure">
  <h3>${escapeHtml(severityEmoji(failure.severity))} ${escapeHtml(failure.code)}</h3>
  <p><span class="severity-badge ${severityClass(failure.severity)}">${escapeHtml(failure.severity)}</span></p>
  <p><strong>Description:</strong> ${escapeHtml(failure.description)}</p>
  <p><strong>Events:</strong> ${eventIds}</p>
  <p><strong>Suggested Steps:</strong></p>
  <ol>
${stepsItems}
  </ol>
</div>`;
    })
    .join('\n');

  return `<h2>Failures</h2>\n${blocks}`;
}

function generateSuggestedSteps(result: AnalysisResult): string {
  if (result.failures.length === 0) {
    return '<h2>Suggested Next Steps</h2><p class="ok-message">No issues detected. The trace appears to represent a normal charging session.</p>';
  }

  const allSteps = new Set<string>();
  for (const failure of result.failures) {
    for (const step of failure.suggestedSteps) {
      allSteps.add(step);
    }
  }

  const items = Array.from(allSteps)
    .map((step) => `<li>${escapeHtml(step)}</li>`)
    .join('\n');

  return `<h2>Suggested Next Steps</h2>\n<ol>\n${items}\n</ol>`;
}

function generateEventAppendix(result: AnalysisResult): string {
  if (result.events.length === 0) {
    return '<h2>Event Appendix</h2><p>No events to display.</p>';
  }

  function formatEventCompact(event: Event): string {
    const time = formatTimestamp(event.timestamp);
    const action = event.action ?? '-';
    return `<tr>
  <td>${escapeHtml(event.id)}</td>
  <td>${escapeHtml(time)}</td>
  <td>${escapeHtml(event.direction)}</td>
  <td>${escapeHtml(event.messageType)}</td>
  <td>${escapeHtml(action)}</td>
  <td><code>${escapeHtml(event.messageId)}</code></td>
</tr>`;
  }

  const rows = result.events.map(formatEventCompact).join('\n');

  return `<h2>Event Appendix</h2>
<table>
  <thead><tr><th>ID</th><th>Timestamp</th><th>Direction</th><th>Type</th><th>Action</th><th>MessageId</th></tr></thead>
  <tbody>
${rows}
  </tbody>
</table>`;
}

// ---------------------------------------------------------------------------
// generateHtmlReport()
// ---------------------------------------------------------------------------

/**
 * Generate a self-contained HTML report from an analysis result.
 *
 * All user-supplied content is HTML-escaped to prevent injection / XSS.
 *
 * @param result - The analysis result to report on
 * @returns A self-contained HTML string (inline CSS, no external dependencies)
 */
export function generateHtmlReport(result: AnalysisResult): string {
  const body = [
    generateHeader(result),
    generateSessionOverview(result),
    generateTimelineSummary(result),
    generateFailures(result),
    generateSuggestedSteps(result),
    generateEventAppendix(result),
  ].join('\n');

  return `<!DOCTYPE html>
<html lang="en">
${generateHead()}
<body>
  <div class="container">
${body}
    <footer>Generated by OCPP DebugKit</footer>
  </div>
</body>
</html>`;
}
