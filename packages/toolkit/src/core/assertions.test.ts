import { describe, it, expect } from 'vitest';
import { runAssertions, evaluateScenario } from './assertions.js';
import { buildSessionTimeline } from './timeline.js';
import { detectFailures } from './detection.js';
import type { Event, RawOcppMessage, Scenario, ScenarioAssertion } from './types.js';

// Helpers
function makeEvent(
  id: string,
  messageId: string,
  messageType: 'Call' | 'CallResult' | 'CallError',
  action: string | null,
  payload: unknown = {},
  timestamp: number | null = null,
  direction: 'CS_TO_CSMS' | 'CSMS_TO_CS' | 'UNKNOWN' = 'CS_TO_CSMS',
): Event {
  let rawMessage: RawOcppMessage;
  if (messageType === 'Call') {
    rawMessage = [2, messageId, action as string, payload];
  } else if (messageType === 'CallResult') {
    rawMessage = [3, messageId, payload];
  } else {
    rawMessage = [4, messageId, 'Error', 'desc', payload];
  }
  return {
    id,
    messageId,
    timestamp,
    direction,
    messageType,
    action,
    payload,
    errorCode: messageType === 'CallError' ? 'Error' : null,
    errorDescription: messageType === 'CallError' ? 'desc' : null,
    rawMessage,
  };
}

function makeContext(events: Event[]) {
  const sessions = buildSessionTimeline(events);
  const failures = detectFailures(events, sessions);
  return { events, sessions, failures };
}

// A normal session for testing (all Calls have matching CallResults, includes Heartbeat)
function normalSessionEvents(): Event[] {
  return [
    makeEvent('e1', 'm1', 'Call', 'BootNotification', { chargePointSerialNumber: 'CS-001' }, 1000),
    makeEvent(
      'e2',
      'm1',
      'CallResult',
      null,
      { status: 'Accepted', interval: 60 },
      1500,
      'CSMS_TO_CS',
    ),
    makeEvent('e3', 'm2', 'Call', 'Authorize', { idTag: 'TAG-001' }, 2000),
    makeEvent(
      'e4',
      'm2',
      'CallResult',
      null,
      { idTagInfo: { status: 'Accepted' } },
      2500,
      'CSMS_TO_CS',
    ),
    makeEvent('e5', 'm3', 'Call', 'StartTransaction', { connectorId: 1, idTag: 'TAG-001' }, 3000),
    makeEvent(
      'e6',
      'm3',
      'CallResult',
      null,
      { idTagInfo: { status: 'Accepted' }, transactionId: 42 },
      3500,
      'CSMS_TO_CS',
    ),
    makeEvent(
      'e7',
      'm4',
      'Call',
      'MeterValues',
      {
        connectorId: 1,
        transactionId: 42,
        meterValue: [{ sampledValue: [{ value: '100' }] }],
      },
      4000,
    ),
    makeEvent('e8', 'm4', 'CallResult', null, {}, 4100, 'CSMS_TO_CS'),
    makeEvent('e9', 'm5', 'Call', 'Heartbeat', {}, 5000),
    makeEvent(
      'e10',
      'm5',
      'CallResult',
      null,
      { currentTime: '2024-01-15T10:00:05Z' },
      5100,
      'CSMS_TO_CS',
    ),
    makeEvent(
      'e11',
      'm6',
      'Call',
      'StopTransaction',
      { transactionId: 42, reason: 'Local' },
      3000 + 30 * 60 * 1000,
    ),
    makeEvent(
      'e12',
      'm6',
      'CallResult',
      null,
      { idTagInfo: { status: 'Accepted' } },
      3000 + 30 * 60 * 1000 + 500,
      'CSMS_TO_CS',
    ),
  ];
}

describe('assertions', () => {
  describe('event_order', () => {
    it('passes when actions appear in order', () => {
      const ctx = makeContext(normalSessionEvents());
      const assertion: ScenarioAssertion = {
        type: 'event_order',
        params: { actions: ['BootNotification', 'Authorize', 'StartTransaction'] },
      };
      const [result] = runAssertions(ctx, [assertion]);
      expect(result?.passed).toBe(true);
    });

    it('fails when actions are out of order', () => {
      const ctx = makeContext(normalSessionEvents());
      const assertion: ScenarioAssertion = {
        type: 'event_order',
        params: { actions: ['StartTransaction', 'BootNotification'] },
      };
      const [result] = runAssertions(ctx, [assertion]);
      expect(result?.passed).toBe(false);
    });

    it('fails when action is missing', () => {
      const ctx = makeContext(normalSessionEvents());
      const assertion: ScenarioAssertion = {
        type: 'event_order',
        params: { actions: ['BootNotification', 'DataTransfer'] },
      };
      const [result] = runAssertions(ctx, [assertion]);
      expect(result?.passed).toBe(false);
    });
  });

  describe('event_count', () => {
    it('passes when count is within range', () => {
      const ctx = makeContext(normalSessionEvents());
      const assertion: ScenarioAssertion = {
        type: 'event_count',
        params: { min: 5, max: 20 },
      };
      const [result] = runAssertions(ctx, [assertion]);
      expect(result?.passed).toBe(true);
    });

    it('passes when counting specific action', () => {
      const ctx = makeContext(normalSessionEvents());
      const assertion: ScenarioAssertion = {
        type: 'event_count',
        params: { min: 1, max: 1, action: 'StartTransaction' },
      };
      const [result] = runAssertions(ctx, [assertion]);
      expect(result?.passed).toBe(true);
    });

    it('fails when count is below min', () => {
      const ctx = makeContext(normalSessionEvents());
      const assertion: ScenarioAssertion = {
        type: 'event_count',
        params: { min: 100 },
      };
      const [result] = runAssertions(ctx, [assertion]);
      expect(result?.passed).toBe(false);
    });

    it('fails when count is above max', () => {
      const ctx = makeContext(normalSessionEvents());
      const assertion: ScenarioAssertion = {
        type: 'event_count',
        params: { max: 3 },
      };
      const [result] = runAssertions(ctx, [assertion]);
      expect(result?.passed).toBe(false);
    });
  });

  describe('payload_field', () => {
    it('passes when field equals expected value', () => {
      const ctx = makeContext(normalSessionEvents());
      const assertion: ScenarioAssertion = {
        type: 'payload_field',
        params: { action: 'Authorize', field: 'idTag', equals: 'TAG-001' },
      };
      const [result] = runAssertions(ctx, [assertion]);
      expect(result?.passed).toBe(true);
    });

    it('passes when checking nested field', () => {
      const ctx = makeContext(normalSessionEvents());
      const assertion: ScenarioAssertion = {
        type: 'payload_field',
        params: { action: 'Authorize', field: 'idTagInfo.status', equals: 'Accepted' },
      };
      // Note: Authorize is a Call, idTagInfo.status is in the CallResult response
      // This should fail because the Call payload only has idTag, not idTagInfo
      const [result] = runAssertions(ctx, [assertion]);
      expect(result?.passed).toBe(false);
    });

    it('fails when field value does not match', () => {
      const ctx = makeContext(normalSessionEvents());
      const assertion: ScenarioAssertion = {
        type: 'payload_field',
        params: { action: 'Authorize', field: 'idTag', equals: 'WRONG-TAG' },
      };
      const [result] = runAssertions(ctx, [assertion]);
      expect(result?.passed).toBe(false);
    });

    it('fails when action not found', () => {
      const ctx = makeContext(normalSessionEvents());
      const assertion: ScenarioAssertion = {
        type: 'payload_field',
        params: { action: 'DataTransfer', field: 'idTag' },
      };
      const [result] = runAssertions(ctx, [assertion]);
      expect(result?.passed).toBe(false);
    });
  });

  describe('timing', () => {
    it('passes when gap is within range', () => {
      const ctx = makeContext(normalSessionEvents());
      const assertion: ScenarioAssertion = {
        type: 'timing',
        params: { actionA: 'BootNotification', actionB: 'StartTransaction', maxGapMs: 5000 },
      };
      const [result] = runAssertions(ctx, [assertion]);
      expect(result?.passed).toBe(true);
    });

    it('fails when gap exceeds maxGapMs', () => {
      const ctx = makeContext(normalSessionEvents());
      const assertion: ScenarioAssertion = {
        type: 'timing',
        params: { actionA: 'BootNotification', actionB: 'StopTransaction', maxGapMs: 1000 },
      };
      const [result] = runAssertions(ctx, [assertion]);
      expect(result?.passed).toBe(false);
    });

    it('fails when gap is below minGapMs', () => {
      const ctx = makeContext(normalSessionEvents());
      const assertion: ScenarioAssertion = {
        type: 'timing',
        params: { actionA: 'BootNotification', actionB: 'Authorize', minGapMs: 10000 },
      };
      const [result] = runAssertions(ctx, [assertion]);
      expect(result?.passed).toBe(false);
    });
  });

  describe('session_state', () => {
    it('passes when session has expected status', () => {
      const ctx = makeContext(normalSessionEvents());
      const assertion: ScenarioAssertion = {
        type: 'session_state',
        params: { expected: 'completed' },
      };
      const [result] = runAssertions(ctx, [assertion]);
      expect(result?.passed).toBe(true);
    });

    it('fails when session status does not match', () => {
      const ctx = makeContext(normalSessionEvents());
      const assertion: ScenarioAssertion = {
        type: 'session_state',
        params: { expected: 'aborted' },
      };
      const [result] = runAssertions(ctx, [assertion]);
      expect(result?.passed).toBe(false);
    });
  });

  describe('failure_severity', () => {
    it('passes when failure has expected severity', () => {
      // Use a trace with FAILED_AUTHORIZATION (severity: warning)
      const events = [
        makeEvent(
          'e1',
          'm1',
          'Call',
          'BootNotification',
          { chargePointSerialNumber: 'CS-001' },
          1000,
        ),
        makeEvent(
          'e2',
          'm1',
          'CallResult',
          null,
          { status: 'Accepted', interval: 60 },
          1500,
          'CSMS_TO_CS',
        ),
        makeEvent('e3', 'm2', 'Call', 'Authorize', { idTag: 'BAD-TAG' }, 2000),
        makeEvent(
          'e4',
          'm2',
          'CallResult',
          null,
          { idTagInfo: { status: 'Invalid' } },
          2500,
          'CSMS_TO_CS',
        ),
      ];
      const ctx = makeContext(events);
      const assertion: ScenarioAssertion = {
        type: 'failure_severity',
        params: { code: 'FAILED_AUTHORIZATION', severity: 'warning' },
      };
      const [result] = runAssertions(ctx, [assertion]);
      expect(result?.passed).toBe(true);
    });

    it('fails when failure not detected', () => {
      const ctx = makeContext(normalSessionEvents());
      const assertion: ScenarioAssertion = {
        type: 'failure_severity',
        params: { code: 'FAILED_AUTHORIZATION', severity: 'warning' },
      };
      const [result] = runAssertions(ctx, [assertion]);
      expect(result?.passed).toBe(false);
    });
  });

  describe('no_failures', () => {
    it('passes when no failures detected', () => {
      const ctx = makeContext(normalSessionEvents());
      const assertion: ScenarioAssertion = {
        type: 'no_failures',
        params: {},
      };
      const [result] = runAssertions(ctx, [assertion]);
      expect(result?.passed).toBe(true);
    });

    it('fails when failures are detected', () => {
      const events = [
        makeEvent(
          'e1',
          'm1',
          'Call',
          'BootNotification',
          { chargePointSerialNumber: 'CS-001' },
          1000,
        ),
        makeEvent(
          'e2',
          'm1',
          'CallResult',
          null,
          { status: 'Accepted', interval: 60 },
          1500,
          'CSMS_TO_CS',
        ),
        makeEvent('e3', 'm2', 'Call', 'Authorize', { idTag: 'BAD-TAG' }, 2000),
        makeEvent(
          'e4',
          'm2',
          'CallResult',
          null,
          { idTagInfo: { status: 'Invalid' } },
          2500,
          'CSMS_TO_CS',
        ),
      ];
      const ctx = makeContext(events);
      const assertion: ScenarioAssertion = {
        type: 'no_failures',
        params: {},
      };
      const [result] = runAssertions(ctx, [assertion]);
      expect(result?.passed).toBe(false);
    });
  });

  describe('failure_count', () => {
    it('passes when failure count is within range', () => {
      const events = [
        makeEvent(
          'e1',
          'm1',
          'Call',
          'BootNotification',
          { chargePointSerialNumber: 'CS-001' },
          1000,
        ),
        makeEvent(
          'e2',
          'm1',
          'CallResult',
          null,
          { status: 'Accepted', interval: 60 },
          1500,
          'CSMS_TO_CS',
        ),
        makeEvent('e3', 'm2', 'Call', 'Authorize', { idTag: 'BAD-TAG' }, 2000),
        makeEvent(
          'e4',
          'm2',
          'CallResult',
          null,
          { idTagInfo: { status: 'Invalid' } },
          2500,
          'CSMS_TO_CS',
        ),
      ];
      const ctx = makeContext(events);
      const assertion: ScenarioAssertion = {
        type: 'failure_count',
        params: { min: 1, max: 3 },
      };
      const [result] = runAssertions(ctx, [assertion]);
      expect(result?.passed).toBe(true);
    });

    it('passes when counting specific failure code', () => {
      const events = [
        makeEvent(
          'e1',
          'm1',
          'Call',
          'BootNotification',
          { chargePointSerialNumber: 'CS-001' },
          1000,
        ),
        makeEvent(
          'e2',
          'm1',
          'CallResult',
          null,
          { status: 'Accepted', interval: 60 },
          1500,
          'CSMS_TO_CS',
        ),
        makeEvent('e3', 'm2', 'Call', 'Authorize', { idTag: 'BAD-TAG' }, 2000),
        makeEvent(
          'e4',
          'm2',
          'CallResult',
          null,
          { idTagInfo: { status: 'Invalid' } },
          2500,
          'CSMS_TO_CS',
        ),
      ];
      const ctx = makeContext(events);
      const assertion: ScenarioAssertion = {
        type: 'failure_count',
        params: { code: 'FAILED_AUTHORIZATION', min: 1 },
      };
      const [result] = runAssertions(ctx, [assertion]);
      expect(result?.passed).toBe(true);
    });

    it('fails when count is below min', () => {
      const ctx = makeContext(normalSessionEvents());
      const assertion: ScenarioAssertion = {
        type: 'failure_count',
        params: { min: 5 },
      };
      const [result] = runAssertions(ctx, [assertion]);
      expect(result?.passed).toBe(false);
    });
  });

  describe('runAssertions (batch)', () => {
    it('evaluates multiple assertions', () => {
      const ctx = makeContext(normalSessionEvents());
      const assertions: ScenarioAssertion[] = [
        { type: 'event_order', params: { actions: ['BootNotification', 'Authorize'] } },
        { type: 'event_count', params: { min: 5 } },
        { type: 'no_failures', params: {} },
      ];
      const results = runAssertions(ctx, assertions);
      expect(results).toHaveLength(3);
      expect(results.every((r) => r.passed)).toBe(true);
    });
  });

  describe('evaluateScenario', () => {
    it('evaluates a scenario with assertions', () => {
      const scenario: Scenario = {
        name: 'test-scenario',
        description: 'Test scenario with assertions',
        trace: {
          events: [
            {
              timestamp: '2024-01-15T10:00:00.000Z',
              message: [2, 'm1', 'BootNotification', { chargePointSerialNumber: 'CS-001' }],
            },
            {
              timestamp: '2024-01-15T10:00:00.500Z',
              message: [3, 'm1', { status: 'Accepted', interval: 60 }],
            },
            {
              timestamp: '2024-01-15T10:00:01.000Z',
              message: [2, 'm2', 'Authorize', { idTag: 'TAG-001' }],
            },
            {
              timestamp: '2024-01-15T10:00:01.500Z',
              message: [3, 'm2', { idTagInfo: { status: 'Accepted' } }],
            },
            {
              timestamp: '2024-01-15T10:00:02.000Z',
              message: [2, 'm3', 'StartTransaction', { connectorId: 1, idTag: 'TAG-001' }],
            },
            {
              timestamp: '2024-01-15T10:00:02.500Z',
              message: [3, 'm3', { idTagInfo: { status: 'Accepted' }, transactionId: 42 }],
            },
            {
              timestamp: '2024-01-15T10:00:03.000Z',
              message: [2, 'mh', 'Heartbeat', {}],
            },
            {
              timestamp: '2024-01-15T10:00:03.500Z',
              message: [3, 'mh', { currentTime: '2024-01-15T10:00:03Z' }],
            },
            {
              timestamp: '2024-01-15T10:00:04.000Z',
              message: [
                2,
                'mmv',
                'MeterValues',
                {
                  connectorId: 1,
                  transactionId: 42,
                  meterValue: [{ sampledValue: [{ value: '100' }] }],
                },
              ],
            },
            {
              timestamp: '2024-01-15T10:00:04.500Z',
              message: [3, 'mmv', {}],
            },
            {
              timestamp: '2024-01-15T10:30:00.000Z',
              message: [2, 'm4', 'StopTransaction', { transactionId: 42, reason: 'Local' }],
            },
            {
              timestamp: '2024-01-15T10:30:00.500Z',
              message: [3, 'm4', { idTagInfo: { status: 'Accepted' } }],
            },
          ],
        },
        expectedFailures: [],
        assertions: [
          {
            type: 'event_order',
            params: {
              actions: ['BootNotification', 'Authorize', 'StartTransaction', 'StopTransaction'],
            },
          },
          { type: 'no_failures', params: {} },
          { type: 'session_state', params: { expected: 'completed' } },
        ],
      };

      const result = evaluateScenario(scenario);
      expect(result.allPassed).toBe(true);
      expect(result.expectedFailuresPassed).toBe(true);
      expect(result.assertions).toHaveLength(3);
      expect(result.assertions.every((a) => a.passed)).toBe(true);
    });

    it('evaluates scenario with assertions that fail', () => {
      const scenario: Scenario = {
        name: 'test-scenario-fail',
        description: 'Test scenario with failing assertions',
        trace: {
          events: [
            {
              timestamp: '2024-01-15T10:00:00.000Z',
              message: [2, 'm1', 'BootNotification', { chargePointSerialNumber: 'CS-001' }],
            },
            {
              timestamp: '2024-01-15T10:00:00.500Z',
              message: [3, 'm1', { status: 'Accepted', interval: 60 }],
            },
          ],
        },
        expectedFailures: [],
        assertions: [{ type: 'event_count', params: { min: 100 } }],
      };

      const result = evaluateScenario(scenario);
      expect(result.allPassed).toBe(false);
      expect(result.assertions[0]?.passed).toBe(false);
    });

    it('works backward compatibly with expectedFailures only (no assertions)', () => {
      const scenario: Scenario = {
        name: 'test-no-assertions',
        description: 'Backward compat — no assertions field',
        trace: {
          events: [
            {
              timestamp: '2024-01-15T10:00:00.000Z',
              message: [2, 'm1', 'BootNotification', { chargePointSerialNumber: 'CS-001' }],
            },
            {
              timestamp: '2024-01-15T10:00:00.500Z',
              message: [3, 'm1', { status: 'Accepted', interval: 60 }],
            },
          ],
        },
        expectedFailures: [],
      };

      const result = evaluateScenario(scenario);
      expect(result.assertions).toHaveLength(0);
      expect(result.allPassed).toBe(true);
    });
  });
});
