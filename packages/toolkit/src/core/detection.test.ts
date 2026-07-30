import { describe, it, expect } from 'vitest';
import { detectFailures } from './detection.js';
import { buildSessionTimeline } from './timeline.js';
import { parseTrace } from './parser.js';
import type { Event, RawOcppMessage } from './types.js';

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

describe('detectFailures', () => {
  describe('FAILED_AUTHORIZATION', () => {
    it('detects rejected Authorize response', () => {
      const events = [
        makeEvent(
          'evt-0001',
          'msg-001',
          'Call',
          'BootNotification',
          { chargePointSerialNumber: 'CS-001' },
          1000,
        ),
        makeEvent(
          'evt-0002',
          'msg-001',
          'CallResult',
          null,
          { status: 'Accepted' },
          1500,
          'CSMS_TO_CS',
        ),
        makeEvent('evt-0003', 'msg-002', 'Call', 'Authorize', { idTag: 'BAD-TAG' }, 2000),
        makeEvent(
          'evt-0004',
          'msg-002',
          'CallResult',
          null,
          { idTagInfo: { status: 'Invalid' } },
          2500,
          'CSMS_TO_CS',
        ),
      ];
      const sessions = buildSessionTimeline(events);
      const failures = detectFailures(events, sessions);

      const authFailures = failures.filter((f) => f.code === 'FAILED_AUTHORIZATION');
      expect(authFailures).toHaveLength(1);
      expect(authFailures[0]?.severity).toBe('warning');
      expect(authFailures[0]?.eventIds).toContain('evt-0003');
      expect(authFailures[0]?.eventIds).toContain('evt-0004');
      expect(authFailures[0]?.suggestedSteps.length).toBeGreaterThan(0);
    });

    it('does not flag accepted Authorize', () => {
      const events = [
        makeEvent('evt-0001', 'msg-001', 'Call', 'Authorize', { idTag: 'GOOD-TAG' }, 1000),
        makeEvent(
          'evt-0002',
          'msg-001',
          'CallResult',
          null,
          { idTagInfo: { status: 'Accepted' } },
          1500,
          'CSMS_TO_CS',
        ),
      ];
      const sessions = buildSessionTimeline(events);
      const failures = detectFailures(events, sessions);

      expect(failures.filter((f) => f.code === 'FAILED_AUTHORIZATION')).toHaveLength(0);
    });

    it('detects multiple failed authorizations', () => {
      const events = [
        makeEvent('evt-0001', 'msg-001', 'Call', 'Authorize', { idTag: 'BAD-1' }, 1000),
        makeEvent(
          'evt-0002',
          'msg-001',
          'CallResult',
          null,
          { idTagInfo: { status: 'Invalid' } },
          1500,
          'CSMS_TO_CS',
        ),
        makeEvent('evt-0003', 'msg-002', 'Call', 'Authorize', { idTag: 'BAD-2' }, 2000),
        makeEvent(
          'evt-0004',
          'msg-002',
          'CallResult',
          null,
          { idTagInfo: { status: 'Invalid' } },
          2500,
          'CSMS_TO_CS',
        ),
      ];
      const sessions = buildSessionTimeline(events);
      const failures = detectFailures(events, sessions);

      expect(failures.filter((f) => f.code === 'FAILED_AUTHORIZATION')).toHaveLength(2);
    });
  });

  describe('CONNECTOR_FAULT', () => {
    it('detects faulted connector during active session', () => {
      const events = [
        makeEvent(
          'evt-0001',
          'msg-001',
          'Call',
          'BootNotification',
          { chargePointSerialNumber: 'CS-001' },
          1000,
        ),
        makeEvent(
          'evt-0002',
          'msg-001',
          'CallResult',
          null,
          { status: 'Accepted' },
          1500,
          'CSMS_TO_CS',
        ),
        makeEvent(
          'evt-0003',
          'msg-002',
          'Call',
          'StartTransaction',
          { connectorId: 1, idTag: 'TAG-001', meterStart: 0 },
          2000,
        ),
        makeEvent(
          'evt-0004',
          'msg-002',
          'CallResult',
          null,
          { transactionId: 100001, idTagInfo: { status: 'Accepted' } },
          2500,
          'CSMS_TO_CS',
        ),
        makeEvent(
          'evt-0005',
          'msg-003',
          'Call',
          'StatusNotification',
          { connectorId: 1, status: 'Faulted', errorCode: 'ConnectorLockFailure' },
          3000,
        ),
        makeEvent('evt-0006', 'msg-003', 'CallResult', null, {}, 3500, 'CSMS_TO_CS'),
        makeEvent(
          'evt-0007',
          'msg-004',
          'Call',
          'StopTransaction',
          { transactionId: 100001, meterStop: 5000, reason: 'Faulted' },
          4000,
        ),
        makeEvent(
          'evt-0008',
          'msg-004',
          'CallResult',
          null,
          { idTagInfo: { status: 'Accepted' } },
          4500,
          'CSMS_TO_CS',
        ),
      ];
      const sessions = buildSessionTimeline(events);
      const failures = detectFailures(events, sessions);

      const faultFailures = failures.filter((f) => f.code === 'CONNECTOR_FAULT');
      expect(faultFailures).toHaveLength(1);
      expect(faultFailures[0]?.severity).toBe('critical');
      expect(faultFailures[0]?.eventIds).toContain('evt-0003'); // StartTransaction
      expect(faultFailures[0]?.eventIds).toContain('evt-0005'); // Faulted StatusNotification
    });

    it('does not flag faulted connector outside active session', () => {
      const events = [
        makeEvent(
          'evt-0001',
          'msg-001',
          'Call',
          'BootNotification',
          { chargePointSerialNumber: 'CS-001' },
          1000,
        ),
        makeEvent(
          'evt-0002',
          'msg-001',
          'CallResult',
          null,
          { status: 'Accepted' },
          1500,
          'CSMS_TO_CS',
        ),
        makeEvent(
          'evt-0003',
          'msg-002',
          'Call',
          'StatusNotification',
          { connectorId: 1, status: 'Faulted', errorCode: 'OtherError' },
          2000,
        ),
        makeEvent('evt-0004', 'msg-002', 'CallResult', null, {}, 2500, 'CSMS_TO_CS'),
      ];
      const sessions = buildSessionTimeline(events);
      const failures = detectFailures(events, sessions);

      expect(failures.filter((f) => f.code === 'CONNECTOR_FAULT')).toHaveLength(0);
    });
  });

  describe('STATION_OFFLINE_DURING_SESSION', () => {
    it('detects session without StopTransaction', () => {
      const events = [
        makeEvent(
          'evt-0001',
          'msg-001',
          'Call',
          'BootNotification',
          { chargePointSerialNumber: 'CS-001' },
          1000,
        ),
        makeEvent(
          'evt-0002',
          'msg-001',
          'CallResult',
          null,
          { status: 'Accepted' },
          1500,
          'CSMS_TO_CS',
        ),
        makeEvent(
          'evt-0003',
          'msg-002',
          'Call',
          'StartTransaction',
          { connectorId: 1, idTag: 'TAG-001', meterStart: 0 },
          2000,
        ),
        makeEvent(
          'evt-0004',
          'msg-002',
          'CallResult',
          null,
          { transactionId: 100001, idTagInfo: { status: 'Accepted' } },
          2500,
          'CSMS_TO_CS',
        ),
        // No StopTransaction — session is active
      ];
      const sessions = buildSessionTimeline(events);
      const failures = detectFailures(events, sessions);

      const offlineFailures = failures.filter((f) => f.code === 'STATION_OFFLINE_DURING_SESSION');
      expect(offlineFailures).toHaveLength(1);
      expect(offlineFailures[0]?.severity).toBe('critical');
    });

    it('does not flag completed sessions', () => {
      const events = [
        makeEvent(
          'evt-0001',
          'msg-001',
          'Call',
          'BootNotification',
          { chargePointSerialNumber: 'CS-001' },
          1000,
        ),
        makeEvent(
          'evt-0002',
          'msg-001',
          'CallResult',
          null,
          { status: 'Accepted' },
          1500,
          'CSMS_TO_CS',
        ),
        makeEvent(
          'evt-0003',
          'msg-002',
          'Call',
          'StartTransaction',
          { connectorId: 1, idTag: 'TAG-001', meterStart: 0 },
          2000,
        ),
        makeEvent(
          'evt-0004',
          'msg-002',
          'CallResult',
          null,
          { transactionId: 100001, idTagInfo: { status: 'Accepted' } },
          2500,
          'CSMS_TO_CS',
        ),
        makeEvent(
          'evt-0005',
          'msg-003',
          'Call',
          'StopTransaction',
          { transactionId: 100001, meterStop: 5000, reason: 'EVDisconnected' },
          3000,
        ),
        makeEvent(
          'evt-0006',
          'msg-003',
          'CallResult',
          null,
          { idTagInfo: { status: 'Accepted' } },
          3500,
          'CSMS_TO_CS',
        ),
      ];
      const sessions = buildSessionTimeline(events);
      const failures = detectFailures(events, sessions);

      expect(failures.filter((f) => f.code === 'STATION_OFFLINE_DURING_SESSION')).toHaveLength(0);
    });

    it('detects Unavailable status during active session', () => {
      const events = [
        makeEvent(
          'evt-0001',
          'msg-001',
          'Call',
          'BootNotification',
          { chargePointSerialNumber: 'CS-001' },
          1000,
        ),
        makeEvent(
          'evt-0002',
          'msg-001',
          'CallResult',
          null,
          { status: 'Accepted' },
          1500,
          'CSMS_TO_CS',
        ),
        makeEvent(
          'evt-0003',
          'msg-002',
          'Call',
          'StartTransaction',
          { connectorId: 1, idTag: 'TAG-001', meterStart: 0 },
          2000,
        ),
        makeEvent(
          'evt-0004',
          'msg-002',
          'CallResult',
          null,
          { transactionId: 100001, idTagInfo: { status: 'Accepted' } },
          2500,
          'CSMS_TO_CS',
        ),
        makeEvent(
          'evt-0005',
          'msg-003',
          'Call',
          'StatusNotification',
          { connectorId: 1, status: 'Unavailable' },
          3000,
        ),
        makeEvent('evt-0006', 'msg-003', 'CallResult', null, {}, 3500, 'CSMS_TO_CS'),
        makeEvent(
          'evt-0007',
          'msg-004',
          'Call',
          'StopTransaction',
          { transactionId: 100001, meterStop: 5000, reason: 'Other' },
          4000,
        ),
        makeEvent(
          'evt-0008',
          'msg-004',
          'CallResult',
          null,
          { idTagInfo: { status: 'Accepted' } },
          4500,
          'CSMS_TO_CS',
        ),
      ];
      const sessions = buildSessionTimeline(events);
      const failures = detectFailures(events, sessions);

      const offlineFailures = failures.filter((f) => f.code === 'STATION_OFFLINE_DURING_SESSION');
      expect(offlineFailures).toHaveLength(1);
    });
  });

  describe('fixture integration', () => {
    it('detects no failures in normal-session fixture', async () => {
      const { normalSession } = await import('./fixtures/index.js');
      const result = parseTrace(JSON.stringify(normalSession));
      const sessions = buildSessionTimeline(result.events);
      const failures = detectFailures(result.events, sessions);
      expect(failures).toHaveLength(0);
    });

    it('detects FAILED_AUTHORIZATION in failed-auth fixture', async () => {
      const { failedAuth } = await import('./fixtures/index.js');
      const result = parseTrace(JSON.stringify(failedAuth));
      const sessions = buildSessionTimeline(result.events);
      const failures = detectFailures(result.events, sessions);
      expect(failures.some((f) => f.code === 'FAILED_AUTHORIZATION')).toBe(true);
    });

    it('detects CONNECTOR_FAULT in connector-fault fixture', async () => {
      const { connectorFault } = await import('./fixtures/index.js');
      const result = parseTrace(JSON.stringify(connectorFault));
      const sessions = buildSessionTimeline(result.events);
      const failures = detectFailures(result.events, sessions);
      expect(failures.some((f) => f.code === 'CONNECTOR_FAULT')).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // v0.2 detection rules
  // -------------------------------------------------------------------------

  describe('TIMEOUT_NO_HEARTBEAT', () => {
    it('detects missing heartbeat when trace spans beyond threshold', () => {
      const events = [
        makeEvent('e1', 'm1', 'Call', 'BootNotification', {}, 0),
        makeEvent(
          'e2',
          'm1',
          'CallResult',
          null,
          { interval: 300, status: 'Accepted' },
          500,
          'CSMS_TO_CS',
        ),
        // No heartbeat, but events span beyond 600s (2x300)
        makeEvent('e3', 'm2', 'Call', 'StatusNotification', { status: 'Available' }, 700_000),
      ];
      const sessions = buildSessionTimeline(events);
      const failures = detectFailures(events, sessions);
      expect(failures.some((f) => f.code === 'TIMEOUT_NO_HEARTBEAT')).toBe(true);
    });

    it('does not flag when heartbeat is present', () => {
      const events = [
        makeEvent('e1', 'm1', 'Call', 'BootNotification', {}, 0),
        makeEvent(
          'e2',
          'm1',
          'CallResult',
          null,
          { interval: 300, status: 'Accepted' },
          500,
          'CSMS_TO_CS',
        ),
        makeEvent('e3', 'm2', 'Call', 'Heartbeat', {}, 100_000),
        makeEvent('e4', 'm2', 'CallResult', null, {}, 100_500, 'CSMS_TO_CS'),
        makeEvent('e5', 'm3', 'Call', 'StatusNotification', { status: 'Available' }, 700_000),
      ];
      const sessions = buildSessionTimeline(events);
      const failures = detectFailures(events, sessions);
      expect(failures.some((f) => f.code === 'TIMEOUT_NO_HEARTBEAT')).toBe(false);
    });

    it('does not flag when trace ends before first heartbeat is due', () => {
      const events = [
        makeEvent('e1', 'm1', 'Call', 'BootNotification', {}, 0),
        makeEvent(
          'e2',
          'm1',
          'CallResult',
          null,
          { interval: 300, status: 'Accepted' },
          500,
          'CSMS_TO_CS',
        ),
        // Trace ends at 100s — before 600s threshold
        makeEvent('e3', 'm2', 'Call', 'StatusNotification', { status: 'Available' }, 100_000),
      ];
      const sessions = buildSessionTimeline(events);
      const failures = detectFailures(events, sessions);
      expect(failures.some((f) => f.code === 'TIMEOUT_NO_HEARTBEAT')).toBe(false);
    });

    it('does not flag when no BootNotification', () => {
      const events = [makeEvent('e1', 'm1', 'Call', 'Heartbeat', {}, 0)];
      const sessions = buildSessionTimeline(events);
      const failures = detectFailures(events, sessions);
      expect(failures.some((f) => f.code === 'TIMEOUT_NO_HEARTBEAT')).toBe(false);
    });
  });

  describe('METER_VALUE_GAP', () => {
    it('detects missing MeterValues in completed transaction', () => {
      const events = [
        makeEvent('e1', 'm1', 'Call', 'StartTransaction', { connectorId: 1, transactionId: 1 }, 0),
        makeEvent('e2', 'm1', 'CallResult', null, { transactionId: 1 }, 500, 'CSMS_TO_CS'),
        makeEvent(
          'e3',
          'm2',
          'Call',
          'StopTransaction',
          { transactionId: 1, reason: 'EVDisconnected' },
          10_000,
        ),
        makeEvent('e4', 'm2', 'CallResult', null, {}, 10_500, 'CSMS_TO_CS'),
      ];
      const sessions = buildSessionTimeline(events);
      const failures = detectFailures(events, sessions);
      expect(failures.some((f) => f.code === 'METER_VALUE_GAP')).toBe(true);
    });

    it('does not flag when MeterValues are present', () => {
      const events = [
        makeEvent('e1', 'm1', 'Call', 'StartTransaction', { connectorId: 1, transactionId: 1 }, 0),
        makeEvent('e2', 'm1', 'CallResult', null, { transactionId: 1 }, 500, 'CSMS_TO_CS'),
        makeEvent('e3', 'm2', 'Call', 'MeterValues', { connectorId: 1, transactionId: 1 }, 5_000),
        makeEvent('e4', 'm2', 'CallResult', null, {}, 5_500, 'CSMS_TO_CS'),
        makeEvent(
          'e5',
          'm3',
          'Call',
          'StopTransaction',
          { transactionId: 1, reason: 'EVDisconnected' },
          10_000,
        ),
        makeEvent('e6', 'm3', 'CallResult', null, {}, 10_500, 'CSMS_TO_CS'),
      ];
      const sessions = buildSessionTimeline(events);
      const failures = detectFailures(events, sessions);
      expect(failures.some((f) => f.code === 'METER_VALUE_GAP')).toBe(false);
    });
  });

  describe('INVALID_STOP_REASON', () => {
    it('detects invalid stop reason', () => {
      const events = [
        makeEvent(
          'e1',
          'm1',
          'Call',
          'StopTransaction',
          { transactionId: 1, reason: 'BadReason' },
          0,
        ),
      ];
      const sessions = buildSessionTimeline(events);
      const failures = detectFailures(events, sessions);
      expect(failures.some((f) => f.code === 'INVALID_STOP_REASON')).toBe(true);
    });

    it('does not flag valid stop reason', () => {
      const events = [
        makeEvent(
          'e1',
          'm1',
          'Call',
          'StopTransaction',
          { transactionId: 1, reason: 'EVDisconnected' },
          0,
        ),
      ];
      const sessions = buildSessionTimeline(events);
      const failures = detectFailures(events, sessions);
      expect(failures.some((f) => f.code === 'INVALID_STOP_REASON')).toBe(false);
    });
  });

  describe('UNEXPECTED_START', () => {
    it('detects StartTransaction without BootNotification or Authorize', () => {
      const events = [
        makeEvent('e1', 'm1', 'Call', 'StartTransaction', { connectorId: 1 }, 0),
        makeEvent('e2', 'm1', 'CallResult', null, { transactionId: 1 }, 500, 'CSMS_TO_CS'),
      ];
      const sessions = buildSessionTimeline(events);
      const failures = detectFailures(events, sessions);
      expect(failures.some((f) => f.code === 'UNEXPECTED_START')).toBe(true);
    });

    it('does not flag when BootNotification precedes StartTransaction', () => {
      const events = [
        makeEvent('e1', 'm1', 'Call', 'BootNotification', {}, 0),
        makeEvent('e2', 'm1', 'CallResult', null, { status: 'Accepted' }, 500, 'CSMS_TO_CS'),
        makeEvent('e3', 'm2', 'Call', 'StartTransaction', { connectorId: 1 }, 1000),
        makeEvent('e4', 'm2', 'CallResult', null, { transactionId: 1 }, 1500, 'CSMS_TO_CS'),
      ];
      const sessions = buildSessionTimeline(events);
      const failures = detectFailures(events, sessions);
      expect(failures.some((f) => f.code === 'UNEXPECTED_START')).toBe(false);
    });
  });

  describe('STATUS_TRANSITION_VIOLATION', () => {
    it('detects illegal transition from Available to Finishing', () => {
      const events = [
        makeEvent(
          'e1',
          'm1',
          'Call',
          'StatusNotification',
          { connectorId: 1, status: 'Available' },
          0,
        ),
        makeEvent(
          'e2',
          'm2',
          'Call',
          'StatusNotification',
          { connectorId: 1, status: 'Finishing' },
          1000,
        ),
      ];
      const sessions = buildSessionTimeline(events);
      const failures = detectFailures(events, sessions);
      expect(failures.some((f) => f.code === 'STATUS_TRANSITION_VIOLATION')).toBe(true);
    });

    it('does not flag valid transition from Available to Preparing', () => {
      const events = [
        makeEvent(
          'e1',
          'm1',
          'Call',
          'StatusNotification',
          { connectorId: 1, status: 'Available' },
          0,
        ),
        makeEvent(
          'e2',
          'm2',
          'Call',
          'StatusNotification',
          { connectorId: 1, status: 'Preparing' },
          1000,
        ),
      ];
      const sessions = buildSessionTimeline(events);
      const failures = detectFailures(events, sessions);
      expect(failures.some((f) => f.code === 'STATUS_TRANSITION_VIOLATION')).toBe(false);
    });

    // Regression tests for the per-connector tracking fix (#128).
    const statusEvent = (id: string, connectorId: number, status: string, ts: number): Event =>
      makeEvent(id, id, 'Call', 'StatusNotification', { connectorId, status }, ts);

    it('does not flag across connectors when interleaved statuses only look invalid globally (#128)', () => {
      const events = [
        statusEvent('e1', 1, 'Charging', 0),
        statusEvent('e2', 2, 'Available', 500),
        statusEvent('e3', 1, 'Finishing', 1000),
      ];
      const failures = detectFailures(events, buildSessionTimeline(events));
      expect(failures.some((f) => f.code === 'STATUS_TRANSITION_VIOLATION')).toBe(false);
    });

    it('still flags a genuine per-connector violation when another connector is interleaved', () => {
      const events = [
        statusEvent('e1', 1, 'Available', 0),
        statusEvent('e2', 2, 'Charging', 500),
        statusEvent('e3', 1, 'Finishing', 1000),
      ];
      const violations = detectFailures(events, buildSessionTimeline(events)).filter(
        (f) => f.code === 'STATUS_TRANSITION_VIOLATION',
      );
      expect(violations).toHaveLength(1);
      expect(violations[0]?.eventIds).toEqual(['e1', 'e3']);
    });

    it('tracks connectorId 0 (whole charge point) as its own series', () => {
      const events = [
        statusEvent('e1', 0, 'Available', 0),
        statusEvent('e2', 1, 'Available', 500),
        statusEvent('e3', 0, 'Finishing', 1000),
      ];
      const violations = detectFailures(events, buildSessionTimeline(events)).filter(
        (f) => f.code === 'STATUS_TRANSITION_VIOLATION',
      );
      expect(violations).toHaveLength(1);
      expect(violations[0]?.eventIds).toEqual(['e1', 'e3']);
    });

    // The transition table of OCPP 1.6 edition 2, section 4.9, transcribed
    // independently of the rule's own matrix so the two have to agree. Written
    // out as the spec table reads, row by row, cell labels in the comments.
    const SPEC_TRANSITION_TABLE: Record<string, string[]> = {
      // A2, A3, A4, A5, A7, A8, A9
      Available: [
        'Preparing',
        'Charging',
        'SuspendedEV',
        'SuspendedEVSE',
        'Reserved',
        'Unavailable',
        'Faulted',
      ],
      // B1, B3, B4, B5, B6, B9
      Preparing: ['Available', 'Charging', 'SuspendedEV', 'SuspendedEVSE', 'Finishing', 'Faulted'],
      // C1, C4, C5, C6, C8, C9
      Charging: [
        'Available',
        'SuspendedEV',
        'SuspendedEVSE',
        'Finishing',
        'Unavailable',
        'Faulted',
      ],
      // D1, D3, D5, D6, D8, D9
      SuspendedEV: [
        'Available',
        'Charging',
        'SuspendedEVSE',
        'Finishing',
        'Unavailable',
        'Faulted',
      ],
      // E1, E3, E4, E6, E8, E9
      SuspendedEVSE: [
        'Available',
        'Charging',
        'SuspendedEV',
        'Finishing',
        'Unavailable',
        'Faulted',
      ],
      // F1, F2, F8, F9
      Finishing: ['Available', 'Preparing', 'Unavailable', 'Faulted'],
      // G1, G2, G8, G9
      Reserved: ['Available', 'Preparing', 'Unavailable', 'Faulted'],
      // H1, H2, H3, H4, H5, H9
      Unavailable: [
        'Available',
        'Preparing',
        'Charging',
        'SuspendedEV',
        'SuspendedEVSE',
        'Faulted',
      ],
      // I1 through I8
      Faulted: [
        'Available',
        'Preparing',
        'Charging',
        'SuspendedEV',
        'SuspendedEVSE',
        'Finishing',
        'Reserved',
        'Unavailable',
      ],
    };

    const CONNECTOR_STATUSES = Object.keys(SPEC_TRANSITION_TABLE);

    const isFlagged = (from: string, to: string): boolean => {
      const events = [statusEvent('e1', 1, from, 0), statusEvent('e2', 1, to, 1000)];
      return detectFailures(events, buildSessionTimeline(events)).some(
        (f) => f.code === 'STATUS_TRANSITION_VIOLATION',
      );
    };

    it('permits every transition the section 4.9 table lists', () => {
      const wronglyFlagged: string[] = [];
      for (const [from, targets] of Object.entries(SPEC_TRANSITION_TABLE)) {
        for (const to of targets) {
          if (isFlagged(from, to)) wronglyFlagged.push(`${from} -> ${to}`);
        }
      }
      expect(wronglyFlagged).toEqual([]);
    });

    it('flags every transition the section 4.9 table omits', () => {
      const wronglyPermitted: string[] = [];
      for (const from of CONNECTOR_STATUSES) {
        for (const to of CONNECTOR_STATUSES) {
          if (from === to) continue; // the diagonal is covered separately
          if (SPEC_TRANSITION_TABLE[from]?.includes(to)) continue;
          if (!isFlagged(from, to)) wronglyPermitted.push(`${from} -> ${to}`);
        }
      }
      expect(wronglyPermitted).toEqual([]);
    });

    // Spot checks for the rows the old matrix got most wrong, kept as named
    // tests so a regression names itself instead of showing up as a list diff.
    it('permits recovery from Faulted into any pre-fault state (row I)', () => {
      for (const to of SPEC_TRANSITION_TABLE.Faulted ?? []) {
        expect(isFlagged('Faulted', to)).toBe(false);
      }
    });

    it('permits resuming an operative state from Unavailable (row H)', () => {
      for (const to of SPEC_TRANSITION_TABLE.Unavailable ?? []) {
        expect(isFlagged('Unavailable', to)).toBe(false);
      }
    });

    it('permits a scheduled availability change during a session (C8, D8, E8, F8)', () => {
      for (const from of ['Charging', 'SuspendedEV', 'SuspendedEVSE', 'Finishing']) {
        expect(isFlagged(from, 'Unavailable')).toBe(false);
      }
    });

    it('permits Preparing to Finishing, the B6 cell added by the 1.6 errata', () => {
      expect(isFlagged('Preparing', 'Finishing')).toBe(false);
    });

    it('flags Preparing to Unavailable and Finishing to Reserved, absent from the table', () => {
      expect(isFlagged('Preparing', 'Unavailable')).toBe(true);
      expect(isFlagged('Finishing', 'Reserved')).toBe(true);
    });

    it('flags a repeated identical status, since the table has no diagonal', () => {
      for (const status of CONNECTOR_STATUSES) {
        expect(isFlagged(status, status)).toBe(true);
      }
    });
  });

  describe('DIAGNOSTICS_FAILURE', () => {
    it('detects UploadFailed diagnostics status', () => {
      const events = [
        makeEvent(
          'e1',
          'm1',
          'Call',
          'DiagnosticsStatusNotification',
          { status: 'UploadFailed' },
          0,
        ),
      ];
      const sessions = buildSessionTimeline(events);
      const failures = detectFailures(events, sessions);
      expect(failures.some((f) => f.code === 'DIAGNOSTICS_FAILURE')).toBe(true);
    });

    it('detects DiagnosisFailed diagnostics status', () => {
      const events = [
        makeEvent(
          'e1',
          'm1',
          'Call',
          'DiagnosticsStatusNotification',
          { status: 'DiagnosisFailed' },
          0,
        ),
      ];
      const sessions = buildSessionTimeline(events);
      const failures = detectFailures(events, sessions);
      expect(failures.some((f) => f.code === 'DIAGNOSTICS_FAILURE')).toBe(true);
    });

    it('does not flag Uploaded diagnostics status', () => {
      const events = [
        makeEvent('e1', 'm1', 'Call', 'DiagnosticsStatusNotification', { status: 'Uploaded' }, 0),
      ];
      const sessions = buildSessionTimeline(events);
      const failures = detectFailures(events, sessions);
      expect(failures.some((f) => f.code === 'DIAGNOSTICS_FAILURE')).toBe(false);
    });
  });

  describe('FIRMWARE_UPDATE_FAILURE', () => {
    it('detects DownloadFailed firmware status', () => {
      const events = [
        makeEvent(
          'e1',
          'm1',
          'Call',
          'FirmwareStatusNotification',
          { status: 'DownloadFailed' },
          0,
        ),
      ];
      const sessions = buildSessionTimeline(events);
      const failures = detectFailures(events, sessions);
      expect(failures.some((f) => f.code === 'FIRMWARE_UPDATE_FAILURE')).toBe(true);
    });

    it('detects InstallFailed firmware status', () => {
      const events = [
        makeEvent('e1', 'm1', 'Call', 'FirmwareStatusNotification', { status: 'InstallFailed' }, 0),
      ];
      const sessions = buildSessionTimeline(events);
      const failures = detectFailures(events, sessions);
      expect(failures.some((f) => f.code === 'FIRMWARE_UPDATE_FAILURE')).toBe(true);
    });

    it('does not flag Downloaded firmware status', () => {
      const events = [
        makeEvent('e1', 'm1', 'Call', 'FirmwareStatusNotification', { status: 'Downloaded' }, 0),
      ];
      const sessions = buildSessionTimeline(events);
      const failures = detectFailures(events, sessions);
      expect(failures.some((f) => f.code === 'FIRMWARE_UPDATE_FAILURE')).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // v0.3 rules
  // -------------------------------------------------------------------------

  describe('SUSPICIOUS_SESSION_DURATION', () => {
    it('detects suspiciously short session (< 60s)', () => {
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
        makeEvent(
          'e5',
          'm3',
          'Call',
          'StartTransaction',
          { connectorId: 1, idTag: 'TAG-001' },
          3000,
        ),
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
          'StopTransaction',
          { transactionId: 42, reason: 'Local' },
          10000,
        ),
        makeEvent(
          'e8',
          'm4',
          'CallResult',
          null,
          { idTagInfo: { status: 'Accepted' } },
          10500,
          'CSMS_TO_CS',
        ),
      ];
      const sessions = buildSessionTimeline(events);
      const failures = detectFailures(events, sessions);
      const durationFailures = failures.filter((f) => f.code === 'SUSPICIOUS_SESSION_DURATION');
      expect(durationFailures).toHaveLength(1);
      expect(durationFailures[0]?.severity).toBe('warning');
    });

    it('detects suspiciously long session (> 24h)', () => {
      const DAY = 24 * 60 * 60 * 1000;
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
        makeEvent(
          'e5',
          'm3',
          'Call',
          'StartTransaction',
          { connectorId: 1, idTag: 'TAG-001' },
          3000,
        ),
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
          'StopTransaction',
          { transactionId: 42, reason: 'Local' },
          3000 + DAY + 1000,
        ),
        makeEvent(
          'e8',
          'm4',
          'CallResult',
          null,
          { idTagInfo: { status: 'Accepted' } },
          3000 + DAY + 1500,
          'CSMS_TO_CS',
        ),
      ];
      const sessions = buildSessionTimeline(events);
      const failures = detectFailures(events, sessions);
      const durationFailures = failures.filter((f) => f.code === 'SUSPICIOUS_SESSION_DURATION');
      expect(durationFailures).toHaveLength(1);
      expect(durationFailures[0]?.severity).toBe('warning');
    });

    it('does not flag normal session duration', () => {
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
        makeEvent(
          'e5',
          'm3',
          'Call',
          'StartTransaction',
          { connectorId: 1, idTag: 'TAG-001' },
          3000,
        ),
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
          'StopTransaction',
          { transactionId: 42, reason: 'Local' },
          3000 + 30 * 60 * 1000,
        ),
        makeEvent(
          'e8',
          'm4',
          'CallResult',
          null,
          { idTagInfo: { status: 'Accepted' } },
          3000 + 30 * 60 * 1000 + 500,
          'CSMS_TO_CS',
        ),
      ];
      const sessions = buildSessionTimeline(events);
      const failures = detectFailures(events, sessions);
      expect(failures.some((f) => f.code === 'SUSPICIOUS_SESSION_DURATION')).toBe(false);
    });
  });

  describe('SLOW_RESPONSE', () => {
    it('detects response gap > 10s', () => {
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
          15000,
          'CSMS_TO_CS',
        ),
      ];
      const sessions = buildSessionTimeline(events);
      const failures = detectFailures(events, sessions);
      const slowFailures = failures.filter((f) => f.code === 'SLOW_RESPONSE');
      expect(slowFailures).toHaveLength(1);
      expect(slowFailures[0]?.severity).toBe('warning');
      expect(slowFailures[0]?.eventIds).toContain('e1');
    });

    it('does not flag fast response', () => {
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
          2000,
          'CSMS_TO_CS',
        ),
      ];
      const sessions = buildSessionTimeline(events);
      const failures = detectFailures(events, sessions);
      expect(failures.some((f) => f.code === 'SLOW_RESPONSE')).toBe(false);
    });
  });

  describe('HEARTBEAT_INTERVAL_VIOLATION', () => {
    it('detects heartbeat interval deviation > 50%', () => {
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
        makeEvent('e3', 'm2', 'Call', 'Heartbeat', {}, 2000),
        makeEvent(
          'e4',
          'm2',
          'CallResult',
          null,
          { currentTime: '2024-01-15T10:00:02Z' },
          2100,
          'CSMS_TO_CS',
        ),
        makeEvent('e5', 'm3', 'Call', 'Heartbeat', {}, 2000 + 120 * 1000), // 120s gap vs 60s expected = 100% deviation
        makeEvent(
          'e6',
          'm3',
          'CallResult',
          null,
          { currentTime: '2024-01-15T10:02:00Z' },
          2000 + 120 * 1000 + 100,
          'CSMS_TO_CS',
        ),
      ];
      const sessions = buildSessionTimeline(events);
      const failures = detectFailures(events, sessions);
      const hbFailures = failures.filter((f) => f.code === 'HEARTBEAT_INTERVAL_VIOLATION');
      expect(hbFailures).toHaveLength(1);
      expect(hbFailures[0]?.severity).toBe('info');
    });

    it('does not flag normal heartbeat interval', () => {
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
        makeEvent('e3', 'm2', 'Call', 'Heartbeat', {}, 2000),
        makeEvent(
          'e4',
          'm2',
          'CallResult',
          null,
          { currentTime: '2024-01-15T10:00:02Z' },
          2100,
          'CSMS_TO_CS',
        ),
        makeEvent('e5', 'm3', 'Call', 'Heartbeat', {}, 2000 + 65 * 1000), // 65s gap vs 60s expected = ~8% deviation
        makeEvent(
          'e6',
          'm3',
          'CallResult',
          null,
          { currentTime: '2024-01-15T10:01:05Z' },
          2000 + 65 * 1000 + 100,
          'CSMS_TO_CS',
        ),
      ];
      const sessions = buildSessionTimeline(events);
      const failures = detectFailures(events, sessions);
      expect(failures.some((f) => f.code === 'HEARTBEAT_INTERVAL_VIOLATION')).toBe(false);
    });

    it('does not flag when fewer than 2 heartbeats', () => {
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
        makeEvent('e3', 'm2', 'Call', 'Heartbeat', {}, 2000),
        makeEvent(
          'e4',
          'm2',
          'CallResult',
          null,
          { currentTime: '2024-01-15T10:00:02Z' },
          2100,
          'CSMS_TO_CS',
        ),
      ];
      const sessions = buildSessionTimeline(events);
      const failures = detectFailures(events, sessions);
      expect(failures.some((f) => f.code === 'HEARTBEAT_INTERVAL_VIOLATION')).toBe(false);
    });
  });

  describe('METER_VALUE_ANOMALY', () => {
    it('detects negative meter value', () => {
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
        makeEvent(
          'e5',
          'm3',
          'Call',
          'StartTransaction',
          { connectorId: 1, idTag: 'TAG-001' },
          3000,
        ),
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
            meterValue: [{ sampledValue: [{ value: '-100' }] }],
          },
          4000,
        ),
        makeEvent(
          'e8',
          'm5',
          'Call',
          'StopTransaction',
          { transactionId: 42, reason: 'Local' },
          5000,
        ),
        makeEvent(
          'e9',
          'm5',
          'CallResult',
          null,
          { idTagInfo: { status: 'Accepted' } },
          5500,
          'CSMS_TO_CS',
        ),
      ];
      const sessions = buildSessionTimeline(events);
      const failures = detectFailures(events, sessions);
      const anomalyFailures = failures.filter((f) => f.code === 'METER_VALUE_ANOMALY');
      expect(anomalyFailures).toHaveLength(1);
      expect(anomalyFailures[0]?.severity).toBe('warning');
    });

    it('detects non-monotonic (decreasing) meter value', () => {
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
        makeEvent(
          'e5',
          'm3',
          'Call',
          'StartTransaction',
          { connectorId: 1, idTag: 'TAG-001' },
          3000,
        ),
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
        makeEvent(
          'e8',
          'm5',
          'Call',
          'MeterValues',
          {
            connectorId: 1,
            transactionId: 42,
            meterValue: [{ sampledValue: [{ value: '50' }] }], // decreased from 100 to 50
          },
          5000,
        ),
        makeEvent(
          'e9',
          'm6',
          'Call',
          'StopTransaction',
          { transactionId: 42, reason: 'Local' },
          6000,
        ),
        makeEvent(
          'e10',
          'm6',
          'CallResult',
          null,
          { idTagInfo: { status: 'Accepted' } },
          6500,
          'CSMS_TO_CS',
        ),
      ];
      const sessions = buildSessionTimeline(events);
      const failures = detectFailures(events, sessions);
      const anomalyFailures = failures.filter((f) => f.code === 'METER_VALUE_ANOMALY');
      expect(anomalyFailures).toHaveLength(1);
      expect(anomalyFailures[0]?.severity).toBe('warning');
    });

    it('does not flag monotonic increasing meter values', () => {
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
        makeEvent(
          'e5',
          'm3',
          'Call',
          'StartTransaction',
          { connectorId: 1, idTag: 'TAG-001' },
          3000,
        ),
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
        makeEvent(
          'e8',
          'm5',
          'Call',
          'MeterValues',
          {
            connectorId: 1,
            transactionId: 42,
            meterValue: [{ sampledValue: [{ value: '200' }] }], // increased from 100 to 200
          },
          5000,
        ),
        makeEvent(
          'e9',
          'm6',
          'Call',
          'StopTransaction',
          { transactionId: 42, reason: 'Local' },
          6000,
        ),
        makeEvent(
          'e10',
          'm6',
          'CallResult',
          null,
          { idTagInfo: { status: 'Accepted' } },
          6500,
          'CSMS_TO_CS',
        ),
      ];
      const sessions = buildSessionTimeline(events);
      const failures = detectFailures(events, sessions);
      expect(failures.some((f) => f.code === 'METER_VALUE_ANOMALY')).toBe(false);
    });

    // Regression tests for the per-(connector, measurand) bucketing fix (#127).
    const meterSession = (meterEvents: Event[]): Event[] => [
      makeEvent('s1', 'ms', 'Call', 'StartTransaction', { connectorId: 1, idTag: 'TAG-127' }, 1000),
      makeEvent(
        's2',
        'ms',
        'CallResult',
        null,
        { idTagInfo: { status: 'Accepted' }, transactionId: 42 },
        1500,
        'CSMS_TO_CS',
      ),
      ...meterEvents,
      makeEvent(
        's9',
        'me',
        'Call',
        'StopTransaction',
        { transactionId: 42, reason: 'Local' },
        9000,
      ),
    ];

    const energyPlusPower = (id: string, ts: number, energy: string): Event =>
      makeEvent(
        id,
        id,
        'Call',
        'MeterValues',
        {
          connectorId: 1,
          transactionId: 42,
          meterValue: [
            {
              sampledValue: [
                { measurand: 'Energy.Active.Import.Register', value: energy, unit: 'Wh' },
                { measurand: 'Power.Active.Import', value: '3000', unit: 'W' },
              ],
            },
          ],
        },
        ts,
      );

    it('does not flag a rising Energy register interleaved with a constant Power sample (#127)', () => {
      const events = meterSession([
        energyPlusPower('a1', 2000, '600'),
        energyPlusPower('a2', 3000, '625'),
        energyPlusPower('a3', 4000, '650'),
      ]);
      const failures = detectFailures(events, buildSessionTimeline(events));
      expect(failures.some((f) => f.code === 'METER_VALUE_ANOMALY')).toBe(false);
    });

    it('still flags a decreasing Energy register when other measurands are present', () => {
      const events = meterSession([
        energyPlusPower('b1', 2000, '600'),
        energyPlusPower('b2', 3000, '500'),
      ]);
      const anomalies = detectFailures(events, buildSessionTimeline(events)).filter(
        (f) => f.code === 'METER_VALUE_ANOMALY',
      );
      expect(anomalies).toHaveLength(1);
    });

    it('does not flag two connector registers that share a transaction (bucketed by connectorId)', () => {
      const meter = (id: string, ts: number, connectorId: number, energy: string): Event =>
        makeEvent(
          id,
          id,
          'Call',
          'MeterValues',
          {
            connectorId,
            transactionId: 42,
            meterValue: [
              {
                sampledValue: [
                  { measurand: 'Energy.Active.Import.Register', value: energy, unit: 'Wh' },
                ],
              },
            ],
          },
          ts,
        );
      const events = meterSession([
        meter('c1', 2000, 1, '6000'),
        meter('c2', 3000, 2, '100'),
        meter('c3', 4000, 1, '6100'),
      ]);
      const failures = detectFailures(events, buildSessionTimeline(events));
      expect(failures.some((f) => f.code === 'METER_VALUE_ANOMALY')).toBe(false);
    });
  });

  describe('UNRESPONSIVE_CSMS', () => {
    it('detects Call with no matching CallResult or CallError', () => {
      const events = [
        makeEvent(
          'e1',
          'm1',
          'Call',
          'BootNotification',
          { chargePointSerialNumber: 'CS-001' },
          1000,
        ),
        // No CallResult for m1
        makeEvent('e2', 'm2', 'Call', 'Heartbeat', {}, 2000),
        makeEvent(
          'e3',
          'm2',
          'CallResult',
          null,
          { currentTime: '2024-01-15T10:00:02Z' },
          2100,
          'CSMS_TO_CS',
        ),
      ];
      const sessions = buildSessionTimeline(events);
      const failures = detectFailures(events, sessions);
      const unresponsiveFailures = failures.filter((f) => f.code === 'UNRESPONSIVE_CSMS');
      expect(unresponsiveFailures).toHaveLength(1);
      expect(unresponsiveFailures[0]?.severity).toBe('critical');
      expect(unresponsiveFailures[0]?.eventIds).toContain('e1');
    });

    it('does not flag Call with matching CallResult', () => {
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
        makeEvent('e3', 'm2', 'Call', 'Heartbeat', {}, 2000),
        makeEvent(
          'e4',
          'm2',
          'CallResult',
          null,
          { currentTime: '2024-01-15T10:00:02Z' },
          2100,
          'CSMS_TO_CS',
        ),
      ];
      const sessions = buildSessionTimeline(events);
      const failures = detectFailures(events, sessions);
      expect(failures.some((f) => f.code === 'UNRESPONSIVE_CSMS')).toBe(false);
    });

    it('does not flag Call with matching CallError', () => {
      const events = [
        makeEvent(
          'e1',
          'm1',
          'Call',
          'BootNotification',
          { chargePointSerialNumber: 'CS-001' },
          1000,
        ),
        makeEvent('e2', 'm1', 'CallError', null, {}, 1500, 'CSMS_TO_CS'),
        makeEvent('e3', 'm2', 'Call', 'Heartbeat', {}, 2000),
        makeEvent(
          'e4',
          'm2',
          'CallResult',
          null,
          { currentTime: '2024-01-15T10:00:02Z' },
          2100,
          'CSMS_TO_CS',
        ),
      ];
      const sessions = buildSessionTimeline(events);
      const failures = detectFailures(events, sessions);
      expect(failures.some((f) => f.code === 'UNRESPONSIVE_CSMS')).toBe(false);
    });
  });

  describe('REPEATED_BOOT_NOTIFICATION', () => {
    it('detects multiple BootNotification calls within 5 minutes', () => {
      const events = [
        makeEvent(
          'e1',
          'm1',
          'Call',
          'BootNotification',
          { chargePointSerialNumber: 'CS-SYNTHETIC-001' },
          0,
        ),
        makeEvent(
          'e2',
          'm1',
          'CallResult',
          null,
          { status: 'Accepted', interval: 60 },
          500,
          'CSMS_TO_CS',
        ),
        makeEvent(
          'e3',
          'm2',
          'Call',
          'BootNotification',
          { chargePointSerialNumber: 'CS-SYNTHETIC-001' },
          4 * 60 * 1000,
        ),
        makeEvent(
          'e4',
          'm2',
          'CallResult',
          null,
          { status: 'Accepted', interval: 60 },
          4 * 60 * 1000 + 500,
          'CSMS_TO_CS',
        ),
      ];
      const sessions = buildSessionTimeline(events);
      const failures = detectFailures(events, sessions);
      const repeatedBootFailures = failures.filter(
        (failure) => failure.code === 'REPEATED_BOOT_NOTIFICATION',
      );

      expect(repeatedBootFailures).toHaveLength(1);
      expect(repeatedBootFailures[0]?.severity).toBe('warning');
      expect(repeatedBootFailures[0]?.eventIds).toEqual(['e1', 'e3']);
      expect(repeatedBootFailures[0]?.suggestedSteps.length).toBeGreaterThan(0);
    });

    it('does not flag BootNotification calls more than 5 minutes apart', () => {
      const events = [
        makeEvent(
          'e1',
          'm1',
          'Call',
          'BootNotification',
          { chargePointSerialNumber: 'CS-SYNTHETIC-001' },
          0,
        ),
        makeEvent(
          'e2',
          'm1',
          'CallResult',
          null,
          { status: 'Accepted', interval: 60 },
          500,
          'CSMS_TO_CS',
        ),
        makeEvent(
          'e3',
          'm2',
          'Call',
          'BootNotification',
          { chargePointSerialNumber: 'CS-SYNTHETIC-001' },
          5 * 60 * 1000 + 1,
        ),
        makeEvent(
          'e4',
          'm2',
          'CallResult',
          null,
          { status: 'Accepted', interval: 60 },
          5 * 60 * 1000 + 501,
          'CSMS_TO_CS',
        ),
      ];
      const sessions = buildSessionTimeline(events);
      const failures = detectFailures(events, sessions);

      expect(failures.some((failure) => failure.code === 'REPEATED_BOOT_NOTIFICATION')).toBe(false);
    });

    it('does not flag repeated BootNotification calls without timestamps', () => {
      const events = [
        makeEvent(
          'e1',
          'm1',
          'Call',
          'BootNotification',
          { chargePointSerialNumber: 'CS-SYNTHETIC-001' },
          null,
        ),
        makeEvent(
          'e2',
          'm1',
          'CallResult',
          null,
          { status: 'Accepted', interval: 60 },
          null,
          'CSMS_TO_CS',
        ),
        makeEvent(
          'e3',
          'm2',
          'Call',
          'BootNotification',
          { chargePointSerialNumber: 'CS-SYNTHETIC-001' },
          null,
        ),
        makeEvent(
          'e4',
          'm2',
          'CallResult',
          null,
          { status: 'Accepted', interval: 60 },
          null,
          'CSMS_TO_CS',
        ),
      ];
      const sessions = buildSessionTimeline(events);
      const failures = detectFailures(events, sessions);

      expect(failures.some((failure) => failure.code === 'REPEATED_BOOT_NOTIFICATION')).toBe(false);
    });
  });
});
