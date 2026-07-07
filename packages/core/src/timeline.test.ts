import { describe, it, expect } from 'vitest';
import { buildSessionTimeline } from './timeline.js';
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

// A normal session: boot, authorize, start tx, meter values, stop tx
function makeNormalSessionEvents(): Event[] {
  return [
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
      { connectorId: 0, status: 'Available' },
      2000,
    ),
    makeEvent('evt-0004', 'msg-002', 'CallResult', null, {}, 2500, 'CSMS_TO_CS'),
    makeEvent('evt-0005', 'msg-003', 'Call', 'Authorize', { idTag: 'TAG-001' }, 3000),
    makeEvent(
      'evt-0006',
      'msg-003',
      'CallResult',
      null,
      { idTagInfo: { status: 'Accepted' } },
      3500,
      'CSMS_TO_CS',
    ),
    makeEvent(
      'evt-0007',
      'msg-004',
      'Call',
      'StartTransaction',
      { connectorId: 1, idTag: 'TAG-001', meterStart: 0 },
      4000,
    ),
    makeEvent(
      'evt-0008',
      'msg-004',
      'CallResult',
      null,
      { transactionId: 100001, idTagInfo: { status: 'Accepted' } },
      4500,
      'CSMS_TO_CS',
    ),
    makeEvent(
      'evt-0009',
      'msg-005',
      'Call',
      'StatusNotification',
      { connectorId: 1, status: 'Charging' },
      5000,
    ),
    makeEvent('evt-0010', 'msg-005', 'CallResult', null, {}, 5500, 'CSMS_TO_CS'),
    makeEvent(
      'evt-0011',
      'msg-006',
      'Call',
      'MeterValues',
      { connectorId: 1, transactionId: 100001, meterValue: [] },
      6000,
    ),
    makeEvent('evt-0012', 'msg-006', 'CallResult', null, {}, 6500, 'CSMS_TO_CS'),
    makeEvent(
      'evt-0013',
      'msg-007',
      'Call',
      'StopTransaction',
      { transactionId: 100001, meterStop: 10000, reason: 'EVDisconnected' },
      7000,
    ),
    makeEvent(
      'evt-0014',
      'msg-007',
      'CallResult',
      null,
      { idTagInfo: { status: 'Accepted' } },
      7500,
      'CSMS_TO_CS',
    ),
  ];
}

describe('buildSessionTimeline', () => {
  it('creates a single session for a normal charging session', () => {
    const events = makeNormalSessionEvents();
    const sessions = buildSessionTimeline(events);
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.transactionId).toBe(100001);
    expect(sessions[0]?.status).toBe('completed');
  });

  it('sets session start and end times', () => {
    const events = makeNormalSessionEvents();
    const sessions = buildSessionTimeline(events);
    expect(sessions[0]?.startTime).toBe(1000);
    expect(sessions[0]?.endTime).toBe(7500);
  });

  it('extracts connectorId from StartTransaction', () => {
    const events = makeNormalSessionEvents();
    const sessions = buildSessionTimeline(events);
    expect(sessions[0]?.connectorId).toBe(1);
  });

  it('extracts stationId from BootNotification', () => {
    const events = makeNormalSessionEvents();
    const sessions = buildSessionTimeline(events);
    expect(sessions[0]?.stationId).toBe('CS-001');
  });

  it('returns "unknown" stationId when no BootNotification', () => {
    const events = [
      makeEvent('evt-0001', 'msg-001', 'Call', 'Authorize', { idTag: 'TAG-001' }, 1000),
    ];
    const sessions = buildSessionTimeline(events);
    expect(sessions[0]?.stationId).toBe('unknown');
  });

  it('sets status to "active" when session has no StopTransaction', () => {
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
        { transactionId: 200001, idTagInfo: { status: 'Accepted' } },
        2500,
        'CSMS_TO_CS',
      ),
    ];
    const sessions = buildSessionTimeline(events);
    expect(sessions[0]?.status).toBe('active');
  });

  it('sets status to "aborted" when connector faults during session', () => {
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
        { transactionId: 300001, idTagInfo: { status: 'Accepted' } },
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
        { transactionId: 300001, meterStop: 5000, reason: 'Faulted' },
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
    expect(sessions[0]?.status).toBe('completed'); // has StopTransaction
  });

  it('handles events with no transactions', () => {
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
      makeEvent('evt-0003', 'msg-002', 'Call', 'Heartbeat', {}, 2000),
      makeEvent(
        'evt-0004',
        'msg-002',
        'CallResult',
        null,
        { currentTime: '2024-01-15T10:00:00.000Z' },
        2500,
        'CSMS_TO_CS',
      ),
    ];
    const sessions = buildSessionTimeline(events);
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.transactionId).toBeNull();
  });

  it('handles empty events array', () => {
    const sessions = buildSessionTimeline([]);
    expect(sessions).toHaveLength(0);
  });

  it('handles multiple sessions', () => {
    const events = [
      // First session
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
      // Second session
      makeEvent(
        'evt-0007',
        'msg-004',
        'Call',
        'StartTransaction',
        { connectorId: 2, idTag: 'TAG-002', meterStart: 0 },
        4000,
      ),
      makeEvent(
        'evt-0008',
        'msg-004',
        'CallResult',
        null,
        { transactionId: 100002, idTagInfo: { status: 'Accepted' } },
        4500,
        'CSMS_TO_CS',
      ),
      makeEvent(
        'evt-0009',
        'msg-005',
        'Call',
        'StopTransaction',
        { transactionId: 100002, meterStop: 3000, reason: 'EVDisconnected' },
        5000,
      ),
      makeEvent(
        'evt-0010',
        'msg-005',
        'CallResult',
        null,
        { idTagInfo: { status: 'Accepted' } },
        5500,
        'CSMS_TO_CS',
      ),
    ];
    const sessions = buildSessionTimeline(events);
    expect(sessions).toHaveLength(2);
    expect(sessions[0]?.transactionId).toBe(100001);
    expect(sessions[1]?.transactionId).toBe(100002);
  });
});
