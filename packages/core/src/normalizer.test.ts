import { describe, it, expect } from 'vitest';
import {
  normalizeEvents,
  normalizeTimestamp,
  inferDirection,
  reverseDirection,
  classifyMessageType,
  extractAction,
  extractPayload,
  extractErrorCode,
  extractErrorDescription,
} from './normalizer.js';
import type { TraceEventInput, RawOcppMessage, Direction } from './types.js';

// Helpers
const call = (id: string, action: string, payload: Record<string, unknown> = {}) =>
  [2, id, action, payload] as RawOcppMessage;
const callResult = (id: string, payload: Record<string, unknown> = {}) =>
  [3, id, payload] as RawOcppMessage;
const callError = (id: string, code = 'InternalError', desc = 'desc', details = {}) =>
  [4, id, code, desc, details] as RawOcppMessage;

// ---------------------------------------------------------------------------
// normalizeTimestamp
// ---------------------------------------------------------------------------

describe('normalizeTimestamp', () => {
  it('parses ISO 8601 UTC string', () => {
    expect(normalizeTimestamp('2024-01-15T10:00:00.000Z')).toBe(
      Date.parse('2024-01-15T10:00:00.000Z'),
    );
  });

  it('parses ISO 8601 with offset', () => {
    const ts = normalizeTimestamp('2024-01-15T12:00:00+02:00');
    expect(ts).toBe(Date.parse('2024-01-15T12:00:00+02:00'));
  });

  it('parses Unix epoch seconds (below 10^12)', () => {
    expect(normalizeTimestamp(1705312200)).toBe(1705312200000);
  });

  it('parses Unix epoch milliseconds (above 10^12)', () => {
    expect(normalizeTimestamp(1705312200000)).toBe(1705312200000);
  });

  it('returns null for null', () => {
    expect(normalizeTimestamp(null)).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(normalizeTimestamp(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(normalizeTimestamp('')).toBeNull();
  });

  it('returns null for invalid string', () => {
    expect(normalizeTimestamp('not a date')).toBeNull();
  });

  it('parses stringified epoch seconds', () => {
    expect(normalizeTimestamp('1705312200')).toBe(1705312200000);
  });

  it('parses stringified epoch milliseconds', () => {
    expect(normalizeTimestamp('1705312200000')).toBe(1705312200000);
  });

  it('returns null for NaN', () => {
    expect(normalizeTimestamp(NaN)).toBeNull();
  });

  it('returns null for Infinity', () => {
    expect(normalizeTimestamp(Infinity)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// inferDirection
// ---------------------------------------------------------------------------

describe('inferDirection', () => {
  it('returns CS_TO_CSMS for BootNotification', () => {
    expect(inferDirection('Call', 'BootNotification')).toBe('CS_TO_CSMS');
  });

  it('returns CS_TO_CSMS for StartTransaction', () => {
    expect(inferDirection('Call', 'StartTransaction')).toBe('CS_TO_CSMS');
  });

  it('returns CSMS_TO_CS for Reset', () => {
    expect(inferDirection('Call', 'Reset')).toBe('CSMS_TO_CS');
  });

  it('returns CSMS_TO_CS for RemoteStartTransaction', () => {
    expect(inferDirection('Call', 'RemoteStartTransaction')).toBe('CSMS_TO_CS');
  });

  it('returns UNKNOWN for unrecognized action', () => {
    expect(inferDirection('Call', 'UnknownAction')).toBe('UNKNOWN');
  });

  it('returns UNKNOWN for CallResult (no action)', () => {
    expect(inferDirection('CallResult', null)).toBe('UNKNOWN');
  });
});

// ---------------------------------------------------------------------------
// reverseDirection
// ---------------------------------------------------------------------------

describe('reverseDirection', () => {
  it('reverses CS_TO_CSMS to CSMS_TO_CS', () => {
    expect(reverseDirection('CS_TO_CSMS')).toBe('CSMS_TO_CS');
  });

  it('reverses CSMS_TO_CS to CS_TO_CSMS', () => {
    expect(reverseDirection('CSMS_TO_CS')).toBe('CS_TO_CSMS');
  });

  it('keeps UNKNOWN as UNKNOWN', () => {
    expect(reverseDirection('UNKNOWN')).toBe('UNKNOWN');
  });
});

// ---------------------------------------------------------------------------
// classifyMessageType
// ---------------------------------------------------------------------------

describe('classifyMessageType', () => {
  it('classifies 2 as Call', () => {
    expect(classifyMessageType(call('m1', 'BootNotification'))).toBe('Call');
  });

  it('classifies 3 as CallResult', () => {
    expect(classifyMessageType(callResult('m1'))).toBe('CallResult');
  });

  it('classifies 4 as CallError', () => {
    expect(classifyMessageType(callError('m1'))).toBe('CallError');
  });
});

// ---------------------------------------------------------------------------
// extractAction / extractPayload / extractError*
// ---------------------------------------------------------------------------

describe('extractAction', () => {
  it('extracts action from Call', () => {
    expect(extractAction(call('m1', 'BootNotification'))).toBe('BootNotification');
  });

  it('returns null for CallResult', () => {
    expect(extractAction(callResult('m1'))).toBeNull();
  });

  it('returns null for CallError', () => {
    expect(extractAction(callError('m1'))).toBeNull();
  });
});

describe('extractPayload', () => {
  it('extracts payload from Call (index 3)', () => {
    const payload = { vendor: 'Test' };
    expect(extractAction(call('m1', 'BootNotification', payload))).toBe('BootNotification');
    expect(extractPayload(call('m1', 'BootNotification', payload))).toEqual(payload);
  });

  it('extracts payload from CallResult (index 2)', () => {
    const payload = { status: 'Accepted' };
    expect(extractPayload(callResult('m1', payload))).toEqual(payload);
  });

  it('extracts ErrorDetails from CallError (index 4)', () => {
    const details = { extra: 'info' };
    expect(extractPayload(callError('m1', 'Code', 'Desc', details))).toEqual(details);
  });
});

describe('extractErrorCode', () => {
  it('extracts error code from CallError', () => {
    expect(extractErrorCode(callError('m1', 'SecurityError', 'desc'))).toBe('SecurityError');
  });

  it('returns null for Call', () => {
    expect(extractErrorCode(call('m1', 'BootNotification'))).toBeNull();
  });

  it('returns null for CallResult', () => {
    expect(extractErrorCode(callResult('m1'))).toBeNull();
  });
});

describe('extractErrorDescription', () => {
  it('extracts error description from CallError', () => {
    expect(extractErrorDescription(callError('m1', 'Code', 'Bad things happened'))).toBe(
      'Bad things happened',
    );
  });

  it('returns null for Call', () => {
    expect(extractErrorDescription(call('m1', 'BootNotification'))).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// normalizeEvents
// ---------------------------------------------------------------------------

describe('normalizeEvents', () => {
  it('normalizes a simple Call + CallResult pair', () => {
    const inputs: TraceEventInput[] = [
      {
        timestamp: '2024-01-15T10:00:00.000Z',
        direction: 'CS_TO_CSMS',
        message: call('m1', 'BootNotification'),
      },
      {
        timestamp: '2024-01-15T10:00:00.500Z',
        direction: 'CSMS_TO_CS',
        message: callResult('m1', { status: 'Accepted' }),
      },
    ];

    const events = normalizeEvents(inputs);
    expect(events).toHaveLength(2);
    expect(events[0]?.messageType).toBe('Call');
    expect(events[0]?.action).toBe('BootNotification');
    expect(events[0]?.direction).toBe('CS_TO_CSMS');
    expect(events[1]?.messageType).toBe('CallResult');
    expect(events[1]?.action).toBeNull();
    expect(events[1]?.direction).toBe('CSMS_TO_CS');
  });

  it('generates sequential IDs', () => {
    const inputs: TraceEventInput[] = [
      { message: call('m1', 'BootNotification') },
      { message: callResult('m1') },
      { message: call('m2', 'Heartbeat') },
    ];

    const events = normalizeEvents(inputs);
    expect(events[0]?.id).toBe('evt-0001');
    expect(events[1]?.id).toBe('evt-0002');
    expect(events[2]?.id).toBe('evt-0003');
  });

  it('infers direction from action when not provided', () => {
    const inputs: TraceEventInput[] = [
      { message: call('m1', 'BootNotification') }, // no direction
    ];

    const events = normalizeEvents(inputs);
    expect(events[0]?.direction).toBe('CS_TO_CSMS');
  });

  it('infers response direction from matched Call', () => {
    const inputs: TraceEventInput[] = [
      { message: call('m1', 'BootNotification') }, // no direction — inferred CS_TO_CSMS
      { message: callResult('m1') }, // no direction — inferred from Call
    ];

    const events = normalizeEvents(inputs);
    expect(events[0]?.direction).toBe('CS_TO_CSMS');
    expect(events[1]?.direction).toBe('CSMS_TO_CS');
  });

  it('keeps UNKNOWN for unmatched responses', () => {
    const inputs: TraceEventInput[] = [
      { message: callResult('m1') }, // no matching Call
    ];

    const events = normalizeEvents(inputs);
    expect(events[0]?.direction).toBe('UNKNOWN');
  });

  it('normalizes timestamps', () => {
    const inputs: TraceEventInput[] = [
      { timestamp: '2024-01-15T10:00:00.000Z', message: call('m1', 'BootNotification') },
      { timestamp: 1705312200, message: call('m2', 'Heartbeat') }, // seconds
    ];

    const events = normalizeEvents(inputs);
    expect(events[0]?.timestamp).toBe(Date.parse('2024-01-15T10:00:00.000Z'));
    expect(events[1]?.timestamp).toBe(1705312200000);
  });

  it('handles missing timestamps', () => {
    const inputs: TraceEventInput[] = [{ message: call('m1', 'BootNotification') }];

    const events = normalizeEvents(inputs);
    expect(events[0]?.timestamp).toBeNull();
  });

  it('preserves rawMessage', () => {
    const rawMsg = call('m1', 'BootNotification', { vendor: 'Test' });
    const inputs: TraceEventInput[] = [{ message: rawMsg }];

    const events = normalizeEvents(inputs);
    expect(events[0]?.rawMessage).toEqual(rawMsg);
  });

  it('extracts error fields from CallError', () => {
    const inputs: TraceEventInput[] = [
      { message: callError('m1', 'SecurityError', 'Cert invalid', { detail: true }) },
    ];

    const events = normalizeEvents(inputs);
    expect(events[0]?.messageType).toBe('CallError');
    expect(events[0]?.errorCode).toBe('SecurityError');
    expect(events[0]?.errorDescription).toBe('Cert invalid');
    expect(events[0]?.payload).toEqual({ detail: true });
  });

  it('respects explicit direction over inferred', () => {
    const inputs: TraceEventInput[] = [
      { direction: 'UNKNOWN' as Direction, message: call('m1', 'BootNotification') },
    ];

    const events = normalizeEvents(inputs);
    expect(events[0]?.direction).toBe('UNKNOWN');
  });

  it('handles empty array', () => {
    const events = normalizeEvents([]);
    expect(events).toHaveLength(0);
  });
});
