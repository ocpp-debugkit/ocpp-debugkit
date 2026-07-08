import { describe, it, expect } from 'vitest';
import { summarizeSession, summarizeSessions } from './summarizer.js';
import { buildSessionTimeline } from './timeline.js';
import { parseTrace } from './parser.js';
import { detectFailures } from './detection.js';
import type { Session, Failure } from './types.js';

describe('summarizeSession', () => {
  it('produces a summary with correct stats', async () => {
    const { normalSession } = await import('./fixtures/index.js');
    const result = parseTrace(JSON.stringify(normalSession));
    const sessions = buildSessionTimeline(result.events);
    const summary = summarizeSession(sessions[0] as Session, 0);

    expect(summary.sessionId).toBe('session-0');
    expect(summary.stationId).toBe('CS-SYNTHETIC-001');
    expect(summary.connectorId).toBe(1);
    expect(summary.transactionId).toBe(100001);
    expect(summary.status).toBe('completed');
    expect(summary.eventCount).toBeGreaterThan(0);
    expect(summary.durationMs).toBeGreaterThan(0);
    expect(summary.failureCount).toBe(0);
    expect(summary.actionSequence).toContain('BootNotification');
    expect(summary.actionSequence).toContain('StartTransaction');
    expect(summary.actionSequence).toContain('StopTransaction');
  });

  it('handles null duration when timestamps are missing', () => {
    const session: Session = {
      sessionId: 'test',
      stationId: 'CS-001',
      connectorId: 1,
      transactionId: 100,
      startTime: null,
      endTime: null,
      events: [],
      status: 'active',
    };
    const summary = summarizeSession(session);
    expect(summary.durationMs).toBeNull();
  });

  it('counts actions in sequence', async () => {
    const { normalSession } = await import('./fixtures/index.js');
    const result = parseTrace(JSON.stringify(normalSession));
    const sessions = buildSessionTimeline(result.events);
    const summary = summarizeSession(sessions[0] as Session, 0);

    // Should include all Call actions in order
    expect(summary.actionSequence[0]).toBe('BootNotification');
    expect(summary.actionSequence).toContain('Authorize');
    expect(summary.actionSequence).toContain('MeterValues');
  });
});

describe('summarizeSessions', () => {
  it('summarizes all sessions with failure counts', async () => {
    const { failedAuth } = await import('./fixtures/index.js');
    const result = parseTrace(JSON.stringify(failedAuth));
    const sessions = buildSessionTimeline(result.events);
    const failures = detectFailures(result.events, sessions);
    const summaries = summarizeSessions(sessions, failures as Failure[]);

    expect(summaries.length).toBe(sessions.length);
    // failed-auth fixture should have failures
    const totalFailures = summaries.reduce((sum, s) => sum + s.failureCount, 0);
    expect(totalFailures).toBeGreaterThan(0);
  });

  it('returns empty array for no sessions', () => {
    const summaries = summarizeSessions([], []);
    expect(summaries).toHaveLength(0);
  });
});
