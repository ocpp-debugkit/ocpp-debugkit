import { describe, it, expect } from 'vitest';
import { generateMarkdownReport } from './markdown.js';
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

describe('generateMarkdownReport', () => {
  it('generates a non-empty Markdown string', () => {
    const result: AnalysisResult = {
      events: [makeEvent('evt-0001', 'msg-001', 'Call', 'BootNotification', 1000)],
      sessions: [],
      failures: [],
      summaries: [],
      warnings: [],
    };

    const report = generateMarkdownReport(result);
    expect(typeof report).toBe('string');
    expect(report.length).toBeGreaterThan(0);
  });

  it('includes the main title', () => {
    const result: AnalysisResult = {
      events: [],
      sessions: [],
      failures: [],
      summaries: [],
      warnings: [],
    };

    const report = generateMarkdownReport(result);
    expect(report).toContain('# OCPP DebugKit — Trace Analysis Report');
  });

  it('includes session overview section', () => {
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

    const report = generateMarkdownReport(result);
    expect(report).toContain('## Session Overview');
    expect(report).toContain('CS-001');
    expect(report).toContain('session-0');
  });

  it('includes failures section with details', () => {
    const failure = makeFailure();
    const result: AnalysisResult = {
      events: [],
      sessions: [],
      failures: [failure],
      summaries: [],
      warnings: [],
    };

    const report = generateMarkdownReport(result);
    expect(report).toContain('## Failures');
    expect(report).toContain('FAILED_AUTHORIZATION');
    expect(report).toContain('Authorization rejected');
    expect(report).toContain('Verify the idTag is valid');
  });

  it('shows no failures message when clean', () => {
    const result: AnalysisResult = {
      events: [],
      sessions: [],
      failures: [],
      summaries: [],
      warnings: [],
    };

    const report = generateMarkdownReport(result);
    expect(report).toContain('## Failures');
    expect(report).toContain('No failures detected');
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

    const report = generateMarkdownReport(result);
    expect(report).toContain('## Timeline Summary');
    expect(report).toContain('BootNotification → Authorize → StartTransaction');
  });

  it('includes event appendix', () => {
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

    const report = generateMarkdownReport(result);
    expect(report).toContain('## Event Appendix');
    expect(report).toContain('evt-0001');
    expect(report).toContain('BootNotification');
  });

  it('includes parse warnings', () => {
    const result: AnalysisResult = {
      events: [],
      sessions: [],
      failures: [],
      summaries: [],
      warnings: [{ index: 5, message: 'Line 6: invalid JSON' }],
    };

    const report = generateMarkdownReport(result);
    expect(report).toContain('## Parse Warnings');
    expect(report).toContain('Line 6: invalid JSON');
  });

  it('includes metadata when provided', () => {
    const result: AnalysisResult = {
      events: [],
      sessions: [],
      failures: [],
      summaries: [],
      warnings: [],
      metadata: {
        stationId: 'CS-SYNTHETIC-001',
        ocppVersion: '1.6',
        source: 'csms-log',
        description: 'Test trace',
      },
    };

    const report = generateMarkdownReport(result);
    expect(report).toContain('CS-SYNTHETIC-001');
    expect(report).toContain('1.6');
    expect(report).toContain('csms-log');
    expect(report).toContain('Test trace');
  });

  it('includes suggested next steps from failures', () => {
    const failure = makeFailure();
    const result: AnalysisResult = {
      events: [],
      sessions: [],
      failures: [failure],
      summaries: [],
      warnings: [],
    };

    const report = generateMarkdownReport(result);
    expect(report).toContain('## Suggested Next Steps');
    expect(report).toContain('Verify the idTag is valid');
    expect(report).toContain('Check the CSMS local authorization list');
  });

  it('includes severity emoji for failures', () => {
    const failure: Failure = {
      code: 'CONNECTOR_FAULT',
      description: 'Connector fault detected',
      severity: 'critical',
      eventIds: ['evt-0001'],
      suggestedSteps: ['Inspect the connector'],
    };

    const result: AnalysisResult = {
      events: [],
      sessions: [],
      failures: [failure],
      summaries: [],
      warnings: [],
    };

    const report = generateMarkdownReport(result);
    expect(report).toContain('🔴');
    expect(report).toContain('CONNECTOR_FAULT');
  });
});
