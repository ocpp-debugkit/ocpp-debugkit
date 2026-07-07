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
});
