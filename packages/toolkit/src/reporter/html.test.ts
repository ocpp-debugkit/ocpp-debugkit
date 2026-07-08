import { describe, it, expect } from 'vitest';
import { generateHtmlReport } from './html.js';
import type { AnalysisResult } from './types.js';
import type { Event, Failure, Session, SessionSummary, RawOcppMessage } from '../core/index.js';

// Helpers
function makeEvent(
  id: string,
  messageId: string,
  messageType: 'Call' | 'CallResult' | 'CallError',
  action: string | null,
  timestamp: number | null = null,
): Event {
  let rawMessage: RawOcppMessage;
  if (messageType === 'Call') {
    rawMessage = [2, messageId, action as string, {}];
  } else if (messageType === 'CallResult') {
    rawMessage = [3, messageId, {}];
  } else {
    rawMessage = [4, messageId, 'Error', 'desc', {}];
  }
  return {
    id,
    messageId,
    timestamp,
    direction: 'CS_TO_CSMS',
    messageType,
    action,
    payload: {},
    errorCode: messageType === 'CallError' ? 'Error' : null,
    errorDescription: messageType === 'CallError' ? 'desc' : null,
    rawMessage,
  };
}

function makeSession(
  sessionId: string,
  events: Event[],
  transactionId: number | null = 100001,
): Session {
  return {
    sessionId,
    stationId: 'CS-001',
    connectorId: 1,
    transactionId,
    startTime: events[0]?.timestamp ?? null,
    endTime: events[events.length - 1]?.timestamp ?? null,
    events,
    status: 'completed',
  };
}

function makeFailure(): Failure {
  return {
    code: 'FAILED_AUTHORIZATION',
    description: 'Authorization rejected: idTag returned "Invalid" status',
    severity: 'warning',
    eventIds: ['evt-0001', 'evt-0002'],
    suggestedSteps: ['Verify the idTag is valid', 'Check the CSMS local authorization list'],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('generateHtmlReport', () => {
  it('generates a non-empty HTML string', () => {
    const result: AnalysisResult = {
      events: [makeEvent('evt-0001', 'msg-001', 'Call', 'BootNotification', 1000)],
      sessions: [],
      failures: [],
      summaries: [],
      warnings: [],
    };

    const report = generateHtmlReport(result);
    expect(typeof report).toBe('string');
    expect(report.length).toBeGreaterThan(0);
    expect(report.toLowerCase()).toContain('<html');
    expect(report.toLowerCase()).toContain('</html>');
  });

  it('contains the main title', () => {
    const result: AnalysisResult = {
      events: [],
      sessions: [],
      failures: [],
      summaries: [],
      warnings: [],
    };

    const report = generateHtmlReport(result);
    expect(report).toContain('OCPP DebugKit — Trace Analysis Report');
  });

  it('contains section headers (Session Overview, Failures, etc.)', () => {
    const result: AnalysisResult = {
      events: [],
      sessions: [],
      failures: [],
      summaries: [],
      warnings: [],
    };

    const report = generateHtmlReport(result);
    expect(report).toContain('Session Overview');
    expect(report).toContain('Timeline Summary');
    expect(report).toContain('Failures');
    expect(report).toContain('Suggested Next Steps');
    expect(report).toContain('Event Appendix');
  });

  it('shows no-failures message when clean', () => {
    const result: AnalysisResult = {
      events: [],
      sessions: [],
      failures: [],
      summaries: [],
      warnings: [],
    };

    const report = generateHtmlReport(result);
    expect(report).toContain('No failures detected');
  });

  it('includes failure details when failures are present', () => {
    const failure = makeFailure();
    const result: AnalysisResult = {
      events: [],
      sessions: [],
      failures: [failure],
      summaries: [],
      warnings: [],
    };

    const report = generateHtmlReport(result);
    expect(report).toContain('FAILED_AUTHORIZATION');
    expect(report).toContain('Authorization rejected');
    expect(report).toContain('Verify the idTag is valid');
    expect(report).toContain('Check the CSMS local authorization list');
  });

  it('includes session overview with session details', () => {
    const events = [
      makeEvent('evt-0001', 'msg-001', 'Call', 'BootNotification', 1000),
      makeEvent('evt-0002', 'msg-002', 'Call', 'StartTransaction', 2000),
    ];
    const session = makeSession('session-0', events);
    const result: AnalysisResult = {
      events,
      sessions: [session],
      failures: [],
      summaries: [
        {
          sessionId: 'session-0',
          stationId: 'CS-001',
          connectorId: 1,
          transactionId: 100001,
          status: 'completed',
          eventCount: 2,
          durationMs: 1000,
          failureCount: 0,
          actionSequence: ['BootNotification', 'StartTransaction'],
        },
      ],
      warnings: [],
    };

    const report = generateHtmlReport(result);
    expect(report).toContain('CS-001');
    expect(report).toContain('session-0');
  });

  it('includes timeline summary with action sequence', () => {
    const summary: SessionSummary = {
      sessionId: 'session-0',
      stationId: 'CS-001',
      connectorId: 1,
      transactionId: 100001,
      status: 'completed',
      eventCount: 5,
      durationMs: 30000,
      failureCount: 0,
      actionSequence: ['BootNotification', 'Authorize', 'StartTransaction'],
    };

    const result: AnalysisResult = {
      events: [],
      sessions: [],
      failures: [],
      summaries: [summary],
      warnings: [],
    };

    const report = generateHtmlReport(result);
    expect(report).toContain('BootNotification → Authorize → StartTransaction');
  });

  it('includes event appendix with event details', () => {
    const events = [
      makeEvent('evt-0001', 'msg-001', 'Call', 'BootNotification', 1000),
      makeEvent('evt-0002', 'msg-001', 'CallResult', null, 1500),
    ];
    const result: AnalysisResult = {
      events,
      sessions: [],
      failures: [],
      summaries: [],
      warnings: [],
    };

    const report = generateHtmlReport(result);
    expect(report).toContain('evt-0001');
    expect(report).toContain('BootNotification');
  });

  it('escapes HTML entities in failure descriptions to prevent XSS', () => {
    const failure: Failure = {
      code: 'FAILED_AUTHORIZATION',
      description: 'Payload contained <script>alert("xss")</script>',
      severity: 'warning',
      eventIds: ['evt-0001'],
      suggestedSteps: ['Fix the <b>config</b>'],
    };
    const result: AnalysisResult = {
      events: [],
      sessions: [],
      failures: [failure],
      summaries: [],
      warnings: [],
    };

    const report = generateHtmlReport(result);
    // The literal <script> tag must NOT appear unescaped
    expect(report).not.toContain('<script>alert("xss")</script>');
    // It must be escaped
    expect(report).toContain('&lt;script&gt;');
    expect(report).toContain('&lt;b&gt;config&lt;/b&gt;');
  });

  it('escapes HTML entities in metadata', () => {
    const result: AnalysisResult = {
      events: [],
      sessions: [],
      failures: [],
      summaries: [],
      warnings: [],
      metadata: {
        stationId: 'CS-<img src=x>',
        description: '<script>evil()</script>',
      },
    };

    const report = generateHtmlReport(result);
    expect(report).not.toContain('<script>evil()</script>');
    expect(report).toContain('&lt;img src=x&gt;');
    expect(report).toContain('&lt;script&gt;evil()&lt;/script&gt;');
  });

  it('produces a self-contained document with no external src/href links', () => {
    const events = [makeEvent('evt-0001', 'msg-001', 'Call', 'BootNotification', 1000)];
    const result: AnalysisResult = {
      events,
      sessions: [makeSession('session-0', events)],
      failures: [makeFailure()],
      summaries: [
        {
          sessionId: 'session-0',
          stationId: 'CS-001',
          connectorId: 1,
          transactionId: 100001,
          status: 'completed',
          eventCount: 1,
          durationMs: 1000,
          failureCount: 1,
          actionSequence: ['BootNotification'],
        },
      ],
      warnings: [{ index: 0, message: 'Line 1: test warning' }],
      metadata: {
        stationId: 'CS-001',
        ocppVersion: '1.6',
        source: 'csms-log',
        description: 'Test trace',
      },
    };

    const report = generateHtmlReport(result);
    // No external resource links: src="http or href="http
    expect(report).not.toMatch(/src\s*=\s*["']https?:\/\//i);
    expect(report).not.toMatch(/href\s*=\s*["']https?:\/\//i);
    // No <link> tags to external stylesheets
    expect(report).not.toMatch(/<link\s/i);
    // No <script src="..."> external imports
    expect(report).not.toMatch(/<script\s+src\s*=\s*["']/i);
  });
});
