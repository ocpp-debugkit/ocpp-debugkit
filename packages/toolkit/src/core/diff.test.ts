import { describe, it, expect } from 'vitest';
import { diffTraces } from './diff.js';
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

function makeParseResult(events: Event[]) {
  return { events, warnings: [] };
}

describe('diffTraces', () => {
  it('returns empty diff for identical traces', () => {
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
    ];
    const a = makeParseResult(events);
    const b = makeParseResult([...events]);
    const diff = diffTraces(a, b);

    expect(diff.onlyInA).toHaveLength(0);
    expect(diff.onlyInB).toHaveLength(0);
    expect(diff.modified).toHaveLength(0);
    expect(diff.failuresOnlyInA).toHaveLength(0);
    expect(diff.failuresOnlyInB).toHaveLength(0);
  });

  it('detects events only in A', () => {
    const eventsA = [
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
    ];
    const eventsB = [
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
    ];
    const diff = diffTraces(makeParseResult(eventsA), makeParseResult(eventsB));

    expect(diff.onlyInA).toHaveLength(1);
    expect(diff.onlyInA[0]?.messageId).toBe('m2');
    expect(diff.onlyInB).toHaveLength(0);
  });

  it('detects events only in B', () => {
    const eventsA = [
      makeEvent(
        'e1',
        'm1',
        'Call',
        'BootNotification',
        { chargePointSerialNumber: 'CS-001' },
        1000,
      ),
    ];
    const eventsB = [
      makeEvent(
        'e1',
        'm1',
        'Call',
        'BootNotification',
        { chargePointSerialNumber: 'CS-001' },
        1000,
      ),
      makeEvent('e2', 'm2', 'Call', 'Heartbeat', {}, 2000),
    ];
    const diff = diffTraces(makeParseResult(eventsA), makeParseResult(eventsB));

    expect(diff.onlyInB).toHaveLength(1);
    expect(diff.onlyInB[0]?.messageId).toBe('m2');
    expect(diff.onlyInA).toHaveLength(0);
  });

  it('detects timestamp differences', () => {
    const eventsA = [
      makeEvent(
        'e1',
        'm1',
        'Call',
        'BootNotification',
        { chargePointSerialNumber: 'CS-001' },
        1000,
      ),
    ];
    const eventsB = [
      makeEvent(
        'e1',
        'm1',
        'Call',
        'BootNotification',
        { chargePointSerialNumber: 'CS-001' },
        2000,
      ),
    ];
    const diff = diffTraces(makeParseResult(eventsA), makeParseResult(eventsB));

    expect(diff.modified).toHaveLength(1);
    expect(diff.modified[0]?.field).toBe('timestamp');
    expect(diff.modified[0]?.valueA).toBe(1000);
    expect(diff.modified[0]?.valueB).toBe(2000);
  });

  it('detects direction differences', () => {
    const eventsA = [makeEvent('e1', 'm1', 'Call', 'BootNotification', {}, 1000, 'CS_TO_CSMS')];
    const eventsB = [makeEvent('e1', 'm1', 'Call', 'BootNotification', {}, 1000, 'CSMS_TO_CS')];
    const diff = diffTraces(makeParseResult(eventsA), makeParseResult(eventsB));

    const directionMods = diff.modified.filter((m) => m.field === 'direction');
    expect(directionMods).toHaveLength(1);
    expect(directionMods[0]?.valueA).toBe('CS_TO_CSMS');
    expect(directionMods[0]?.valueB).toBe('CSMS_TO_CS');
  });

  it('detects action differences', () => {
    const eventsA = [makeEvent('e1', 'm1', 'Call', 'BootNotification', {}, 1000)];
    const eventsB = [makeEvent('e1', 'm1', 'Call', 'Heartbeat', {}, 1000)];
    const diff = diffTraces(makeParseResult(eventsA), makeParseResult(eventsB));

    const actionMods = diff.modified.filter((m) => m.field === 'action');
    expect(actionMods).toHaveLength(1);
    expect(actionMods[0]?.valueA).toBe('BootNotification');
    expect(actionMods[0]?.valueB).toBe('Heartbeat');
  });

  it('detects payload differences', () => {
    const eventsA = [
      makeEvent(
        'e1',
        'm1',
        'Call',
        'BootNotification',
        { chargePointSerialNumber: 'CS-001' },
        1000,
      ),
    ];
    const eventsB = [
      makeEvent(
        'e1',
        'm1',
        'Call',
        'BootNotification',
        { chargePointSerialNumber: 'CS-002' },
        1000,
      ),
    ];
    const diff = diffTraces(makeParseResult(eventsA), makeParseResult(eventsB));

    const payloadMods = diff.modified.filter((m) => m.field === 'payload');
    expect(payloadMods).toHaveLength(1);
  });

  it('does not flag identical payloads', () => {
    const eventsA = [
      makeEvent(
        'e1',
        'm1',
        'Call',
        'BootNotification',
        { chargePointSerialNumber: 'CS-001', firmwareVersion: '1.0.0' },
        1000,
      ),
    ];
    const eventsB = [
      makeEvent(
        'e1',
        'm1',
        'Call',
        'BootNotification',
        { chargePointSerialNumber: 'CS-001', firmwareVersion: '1.0.0' },
        1000,
      ),
    ];
    const diff = diffTraces(makeParseResult(eventsA), makeParseResult(eventsB));

    expect(diff.modified).toHaveLength(0);
  });

  it('detects errorCode differences', () => {
    const eventsA = [makeEvent('e1', 'm1', 'CallError', null, {}, 1000, 'CSMS_TO_CS')];
    const eventsB: Event[] = [
      {
        ...makeEvent('e1', 'm1', 'CallError', null, {}, 1000, 'CSMS_TO_CS'),
        errorCode: 'DifferentError',
      },
    ];
    const diff = diffTraces(makeParseResult(eventsA), makeParseResult(eventsB));

    const errorMods = diff.modified.filter((m) => m.field === 'errorCode');
    expect(errorMods).toHaveLength(1);
    expect(errorMods[0]?.valueA).toBe('Error');
    expect(errorMods[0]?.valueB).toBe('DifferentError');
  });

  it('detects failure differences', () => {
    // Trace A: failed authorization
    const eventsA = [
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

    // Trace B: accepted authorization
    const eventsB = [
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
      makeEvent('e3', 'm2', 'Call', 'Authorize', { idTag: 'GOOD-TAG' }, 2000),
      makeEvent(
        'e4',
        'm2',
        'CallResult',
        null,
        { idTagInfo: { status: 'Accepted' } },
        2500,
        'CSMS_TO_CS',
      ),
    ];

    const diff = diffTraces(makeParseResult(eventsA), makeParseResult(eventsB));

    expect(diff.failuresOnlyInA.some((f) => f.code === 'FAILED_AUTHORIZATION')).toBe(true);
    expect(diff.failuresOnlyInB.some((f) => f.code === 'FAILED_AUTHORIZATION')).toBe(false);
  });

  it('detects summary differences', () => {
    const eventsA = [
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

    const eventsB = [
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
      makeEvent('e5', 'm3', 'Call', 'StartTransaction', { connectorId: 1, idTag: 'TAG-001' }, 3000),
      makeEvent(
        'e6',
        'm3',
        'CallResult',
        null,
        { idTagInfo: { status: 'Accepted' }, transactionId: 99 },
        3500,
        'CSMS_TO_CS',
      ),
      makeEvent(
        'e7',
        'm4',
        'Call',
        'StopTransaction',
        { transactionId: 99, reason: 'Local' },
        3000 + 60 * 60 * 1000,
      ),
      makeEvent(
        'e8',
        'm4',
        'CallResult',
        null,
        { idTagInfo: { status: 'Accepted' } },
        3000 + 60 * 60 * 1000 + 500,
        'CSMS_TO_CS',
      ),
    ];

    const diff = diffTraces(makeParseResult(eventsA), makeParseResult(eventsB));

    expect(diff.summaryDiff.differences.length).toBeGreaterThan(0);
    expect(diff.summaryDiff.differences.some((d) => d.includes('Transaction ID'))).toBe(true);
    expect(diff.summaryDiff.differences.some((d) => d.includes('Duration'))).toBe(true);
  });

  it('handles completely different traces', () => {
    const eventsA = [
      makeEvent('a1', 'ma1', 'Call', 'BootNotification', {}, 1000),
      makeEvent('a2', 'ma1', 'CallResult', null, { status: 'Accepted' }, 1500, 'CSMS_TO_CS'),
    ];
    const eventsB = [
      makeEvent('b1', 'mb1', 'Call', 'Heartbeat', {}, 2000),
      makeEvent(
        'b2',
        'mb1',
        'CallResult',
        null,
        { currentTime: '2024-01-15T10:00:02Z' },
        2100,
        'CSMS_TO_CS',
      ),
    ];
    const diff = diffTraces(makeParseResult(eventsA), makeParseResult(eventsB));

    expect(diff.onlyInA).toHaveLength(2);
    expect(diff.onlyInB).toHaveLength(2);
    expect(diff.modified).toHaveLength(0);
  });

  it('works with parsed trace input', () => {
    const jsonA = JSON.stringify({
      events: [
        { timestamp: '2024-01-15T10:00:00.000Z', message: [2, 'm1', 'BootNotification', {}] },
        {
          timestamp: '2024-01-15T10:00:00.500Z',
          message: [3, 'm1', { status: 'Accepted', interval: 60 }],
        },
      ],
    });
    const jsonB = JSON.stringify({
      events: [
        { timestamp: '2024-01-15T10:00:00.000Z', message: [2, 'm1', 'BootNotification', {}] },
        {
          timestamp: '2024-01-15T10:00:01.500Z',
          message: [3, 'm1', { status: 'Accepted', interval: 60 }],
        },
      ],
    });
    const resultA = parseTrace(jsonA);
    const resultB = parseTrace(jsonB);
    const diff = diffTraces(resultA, resultB);

    const timestampMods = diff.modified.filter((m) => m.field === 'timestamp');
    expect(timestampMods).toHaveLength(1);
  });
});
