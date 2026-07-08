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
});
