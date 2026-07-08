/**
 * Session summarizer — produces overview statistics for a charging session.
 *
 * @see ADR-0003
 */

import type { Session, SessionSummary } from './types.js';

/**
 * Summarize a charging session with overview statistics.
 *
 * @param session - The session to summarize
 * @param failureCount - Number of failures detected in this session
 * @returns Summary statistics
 */
export function summarizeSession(session: Session, failureCount = 0): SessionSummary {
  const actionSequence = session.events
    .filter((e) => e.messageType === 'Call' && e.action !== null)
    .map((e) => e.action as string);

  const durationMs =
    session.startTime !== null && session.endTime !== null
      ? session.endTime - session.startTime
      : null;

  return {
    sessionId: session.sessionId,
    stationId: session.stationId,
    connectorId: session.connectorId,
    transactionId: session.transactionId,
    status: session.status,
    eventCount: session.events.length,
    durationMs,
    failureCount,
    actionSequence,
  };
}

/**
 * Summarize all sessions in a trace.
 *
 * @param sessions - All sessions in the trace
 * @param failures - All detected failures
 * @returns Array of session summaries
 */
export function summarizeSessions(
  sessions: Session[],
  failures: { eventIds: string[] }[],
): SessionSummary[] {
  return sessions.map((session) => {
    // Count failures that belong to this session
    const sessionEventIds = new Set(session.events.map((e) => e.id));
    const failureCount = failures.filter((f) =>
      f.eventIds.some((id) => sessionEventIds.has(id)),
    ).length;

    return summarizeSession(session, failureCount);
  });
}
