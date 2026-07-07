/**
 * Markdown report generator — produces a human-readable Markdown report
 * from an AnalysisResult.
 *
 * Sections:
 * 1. Session overview (station ID, connector, duration, status)
 * 2. Timeline summary (event count, action sequence)
 * 3. Failures (severity, description, suggested steps)
 * 4. Suggested next steps
 * 5. Raw event appendix (compact)
 */

import type { AnalysisResult } from './types.js';
import type { Event } from '@ocpp-debugkit/core';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

/** Compact representation of an event for the appendix. */
function formatEventCompact(event: Event): string {
  const time = formatTimestamp(event.timestamp);
  const dir = event.direction;
  const type = event.messageType;
  const action = event.action ?? '-';
  const msgId = event.messageId;
  return `| ${event.id} | ${time} | ${dir} | ${type} | ${action} | ${msgId} |`;
}

// ---------------------------------------------------------------------------
// Section generators
// ---------------------------------------------------------------------------

function generateHeader(result: AnalysisResult): string {
  const lines: string[] = ['# OCPP DebugKit — Trace Analysis Report', ''];

  if (result.metadata?.stationId) {
    lines.push(`**Station:** ${result.metadata.stationId}`);
  }
  if (result.metadata?.ocppVersion) {
    lines.push(`**OCPP Version:** ${result.metadata.ocppVersion}`);
  }
  if (result.metadata?.source) {
    lines.push(`**Source:** ${result.metadata.source}`);
  }
  if (result.metadata?.description) {
    lines.push(`**Description:** ${result.metadata.description}`);
  }

  lines.push(
    `**Events:** ${result.events.length}`,
    `**Sessions:** ${result.sessions.length}`,
    `**Failures:** ${result.failures.length}`,
    `**Warnings:** ${result.warnings.length}`,
  );

  if (result.warnings.length > 0) {
    lines.push('', '## Parse Warnings', '');
    for (const w of result.warnings) {
      lines.push(`- ${w.message}`);
    }
  }

  return lines.join('\n');
}

function generateSessionOverview(result: AnalysisResult): string {
  if (result.sessions.length === 0) {
    return '## Session Overview\n\nNo sessions detected.\n';
  }

  const lines: string[] = [
    '## Session Overview',
    '',
    '| Session | Station | Connector | Transaction | Start | End | Duration | Status |',
    '|---------|---------|-----------|-------------|-------|-----|----------|--------|',
  ];

  for (const session of result.sessions) {
    const summary = result.summaries.find((s) => s.sessionId === session.sessionId);
    const duration = summary?.durationMs ?? null;
    lines.push(
      `| ${session.sessionId} | ${session.stationId} | ${session.connectorId ?? '-'} | ${session.transactionId ?? '-'} | ${formatTimestamp(session.startTime)} | ${formatTimestamp(session.endTime)} | ${formatDuration(duration)} | ${session.status} |`,
    );
  }

  return lines.join('\n');
}

function generateTimelineSummary(result: AnalysisResult): string {
  if (result.summaries.length === 0) {
    return '## Timeline Summary\n\nNo sessions to summarize.\n';
  }

  const lines: string[] = ['## Timeline Summary', ''];

  for (const summary of result.summaries) {
    lines.push(
      `### ${summary.sessionId}`,
      '',
      `- **Events:** ${summary.eventCount}`,
      `- **Duration:** ${formatDuration(summary.durationMs)}`,
      `- **Failures:** ${summary.failureCount}`,
      `- **Action Sequence:** ${summary.actionSequence.join(' → ') || 'None'}`,
      '',
    );
  }

  return lines.join('\n');
}

function generateFailures(result: AnalysisResult): string {
  if (result.failures.length === 0) {
    return '## Failures\n\nNo failures detected. ✅\n';
  }

  const lines: string[] = ['## Failures', ''];

  for (const failure of result.failures) {
    lines.push(
      `### ${severityEmoji(failure.severity)} ${failure.code}`,
      '',
      `**Severity:** ${failure.severity}`,
      `**Description:** ${failure.description}`,
      `**Events:** ${failure.eventIds.join(', ')}`,
      '',
      '**Suggested Steps:**',
      '',
    );
    for (const step of failure.suggestedSteps) {
      lines.push(`1. ${step}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function generateSuggestedSteps(result: AnalysisResult): string {
  if (result.failures.length === 0) {
    return '## Suggested Next Steps\n\nNo issues detected. The trace appears to represent a normal charging session.\n';
  }

  const lines: string[] = ['## Suggested Next Steps', ''];

  // Collect unique suggested steps from all failures
  const allSteps = new Set<string>();
  for (const failure of result.failures) {
    for (const step of failure.suggestedSteps) {
      allSteps.add(step);
    }
  }

  let i = 1;
  for (const step of allSteps) {
    lines.push(`${i}. ${step}`);
    i++;
  }

  return lines.join('\n');
}

function generateEventAppendix(result: AnalysisResult): string {
  if (result.events.length === 0) {
    return '## Event Appendix\n\nNo events to display.\n';
  }

  const lines: string[] = [
    '## Event Appendix',
    '',
    '| ID | Timestamp | Direction | Type | Action | MessageId |',
    '|----|-----------|-----------|------|--------|-----------|',
  ];

  for (const event of result.events) {
    lines.push(formatEventCompact(event));
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// generateMarkdownReport()
// ---------------------------------------------------------------------------

/**
 * Generate a Markdown report from an analysis result.
 *
 * @param result - The analysis result to report on
 * @returns A Markdown string
 */
export function generateMarkdownReport(result: AnalysisResult): string {
  const sections: string[] = [
    generateHeader(result),
    generateSessionOverview(result),
    generateTimelineSummary(result),
    generateFailures(result),
    generateSuggestedSteps(result),
    generateEventAppendix(result),
  ];

  return sections.join('\n\n');
}
