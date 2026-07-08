import { describe, it, expect } from 'vitest';
import { parseTrace, ParseError, MAX_INPUT_SIZE_BYTES, MAX_EVENT_COUNT } from './parser.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A minimal valid Call message. */
const call = (id: string, action: string, payload: Record<string, unknown> = {}) =>
  [2, id, action, payload] as [number, string, ...unknown[]];

/** A minimal valid CallResult message. */
const callResult = (id: string, payload: Record<string, unknown> = {}) =>
  [3, id, payload] as [number, string, ...unknown[]];

/** A minimal valid CallError message. */
const callError = (id: string, code = 'InternalError', desc = 'desc', details = {}) =>
  [4, id, code, desc, details] as [number, string, ...unknown[]];

// ---------------------------------------------------------------------------
// JSON Object format
// ---------------------------------------------------------------------------

describe('parseTrace — JSON Object format', () => {
  it('parses a valid JSON Object trace', () => {
    const input = JSON.stringify({
      traceId: 'test-001',
      metadata: { stationId: 'CS-001', ocppVersion: '1.6' },
      events: [
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
      ],
    });

    const result = parseTrace(input);
    expect(result.events).toHaveLength(2);
    expect(result.warnings).toHaveLength(0);
    expect(result.events[0]?.messageType).toBe('Call');
    expect(result.events[0]?.action).toBe('BootNotification');
    expect(result.events[1]?.messageType).toBe('CallResult');
  });

  it('parses a trace without metadata', () => {
    const input = JSON.stringify({
      events: [{ message: call('m1', 'BootNotification') }, { message: callResult('m1') }],
    });

    const result = parseTrace(input);
    expect(result.events).toHaveLength(2);
  });

  it('throws on empty events array', () => {
    const input = JSON.stringify({ events: [] });
    expect(() => parseTrace(input)).toThrow(ParseError);
  });

  it('throws on missing events field', () => {
    const input = JSON.stringify({ traceId: 'test' });
    expect(() => parseTrace(input)).toThrow(ParseError);
  });

  it('throws on invalid JSON', () => {
    expect(() => parseTrace('{ invalid json }')).toThrow(ParseError);
  });

  it('throws on empty input', () => {
    expect(() => parseTrace('')).toThrow(ParseError);
    expect(() => parseTrace('   ')).toThrow(ParseError);
  });
});

// ---------------------------------------------------------------------------
// JSONL format
// ---------------------------------------------------------------------------

describe('parseTrace — JSONL format', () => {
  it('parses valid JSONL', () => {
    const input = [
      JSON.stringify({
        timestamp: '2024-01-15T10:00:00.000Z',
        direction: 'CS_TO_CSMS',
        message: call('m1', 'BootNotification'),
      }),
      JSON.stringify({
        timestamp: '2024-01-15T10:00:00.500Z',
        direction: 'CSMS_TO_CS',
        message: callResult('m1', { status: 'Accepted' }),
      }),
    ].join('\n');

    const result = parseTrace(input);
    expect(result.events).toHaveLength(2);
    expect(result.warnings).toHaveLength(0);
  });

  it('skips blank lines', () => {
    const input = [
      JSON.stringify({ message: call('m1', 'BootNotification') }),
      '',
      '  ',
      JSON.stringify({ message: callResult('m1') }),
    ].join('\n');

    const result = parseTrace(input);
    expect(result.events).toHaveLength(2);
  });

  it('produces warnings for malformed lines', () => {
    const input = [
      JSON.stringify({ message: call('m1', 'BootNotification') }),
      '{ bad json',
      JSON.stringify({ message: callResult('m1') }),
    ].join('\n');

    const result = parseTrace(input);
    expect(result.events).toHaveLength(2);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]?.index).toBe(1);
  });

  it('produces warnings for invalid event structure', () => {
    const input = [
      JSON.stringify({ message: call('m1', 'BootNotification') }),
      JSON.stringify({ foo: 'bar' }), // missing message field
    ].join('\n');

    const result = parseTrace(input);
    expect(result.events).toHaveLength(1);
    expect(result.warnings).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Bare array format
// ---------------------------------------------------------------------------

describe('parseTrace — bare array format', () => {
  it('parses a bare array of raw OCPP messages', () => {
    const input = JSON.stringify([
      call('m1', 'BootNotification', { chargePointVendor: 'Test' }),
      callResult('m1', { status: 'Accepted' }),
    ]);

    const result = parseTrace(input);
    expect(result.events).toHaveLength(2);
    expect(result.events[0]?.messageType).toBe('Call');
    expect(result.events[0]?.action).toBe('BootNotification');
    expect(result.events[0]?.timestamp).toBeNull();
  });

  it('throws on empty bare array', () => {
    const input = '[]';
    expect(() => parseTrace(input)).toThrow(ParseError);
  });
});

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

describe('parseTrace — normalization', () => {
  it('normalizes ISO 8601 timestamps to epoch ms', () => {
    const input = JSON.stringify({
      events: [{ timestamp: '2024-01-15T10:00:00.000Z', message: call('m1', 'BootNotification') }],
    });

    const result = parseTrace(input);
    expect(result.events[0]?.timestamp).toBe(Date.parse('2024-01-15T10:00:00.000Z'));
  });

  it('normalizes Unix epoch seconds to ms', () => {
    const input = JSON.stringify({
      events: [
        { timestamp: 1705312200, message: call('m1', 'BootNotification') }, // seconds
      ],
    });

    const result = parseTrace(input);
    expect(result.events[0]?.timestamp).toBe(1705312200000);
  });

  it('normalizes Unix epoch milliseconds directly', () => {
    const input = JSON.stringify({
      events: [{ timestamp: 1705312200000, message: call('m1', 'BootNotification') }],
    });

    const result = parseTrace(input);
    expect(result.events[0]?.timestamp).toBe(1705312200000);
  });

  it('sets timestamp to null when missing', () => {
    const input = JSON.stringify({
      events: [{ message: call('m1', 'BootNotification') }],
    });

    const result = parseTrace(input);
    expect(result.events[0]?.timestamp).toBeNull();
  });

  it('sets timestamp to null for invalid string', () => {
    const input = JSON.stringify({
      events: [{ timestamp: 'not a date', message: call('m1', 'BootNotification') }],
    });

    const result = parseTrace(input);
    expect(result.events[0]?.timestamp).toBeNull();
  });

  it('infers direction from action name for Call messages', () => {
    const input = JSON.stringify({
      events: [
        { message: [2, 'm1', 'BootNotification', {}] }, // no direction
      ],
    });

    const result = parseTrace(input);
    expect(result.events[0]?.direction).toBe('CS_TO_CSMS');
  });

  it('infers CSMS_TO_CS for CSMS-initiated actions', () => {
    const input = JSON.stringify({
      events: [
        { message: [2, 'm1', 'Reset', {}] }, // no direction
      ],
    });

    const result = parseTrace(input);
    expect(result.events[0]?.direction).toBe('CSMS_TO_CS');
  });

  it('resolves response direction from matched Call', () => {
    const input = JSON.stringify({
      events: [
        { message: [2, 'm1', 'BootNotification', {}] }, // CS_TO_CSMS (inferred)
        { message: [3, 'm1', { status: 'Accepted' }] }, // no direction — should be CSMS_TO_CS
      ],
    });

    const result = parseTrace(input);
    expect(result.events[0]?.direction).toBe('CS_TO_CSMS');
    expect(result.events[1]?.direction).toBe('CSMS_TO_CS');
  });

  it('generates sequential event IDs', () => {
    const input = JSON.stringify({
      events: [
        { message: call('m1', 'BootNotification') },
        { message: callResult('m1') },
        { message: call('m2', 'Heartbeat') },
      ],
    });

    const result = parseTrace(input);
    expect(result.events[0]?.id).toBe('evt-0001');
    expect(result.events[1]?.id).toBe('evt-0002');
    expect(result.events[2]?.id).toBe('evt-0003');
  });

  it('extracts action from Call messages', () => {
    const input = JSON.stringify({
      events: [{ message: call('m1', 'StartTransaction') }],
    });

    const result = parseTrace(input);
    expect(result.events[0]?.action).toBe('StartTransaction');
  });

  it('sets action to null for CallResult', () => {
    const input = JSON.stringify({
      events: [{ message: callResult('m1', { status: 'Accepted' }) }],
    });

    const result = parseTrace(input);
    expect(result.events[0]?.action).toBeNull();
  });

  it('extracts error fields from CallError', () => {
    const input = JSON.stringify({
      events: [{ message: callError('m1', 'SecurityError', 'Certificate invalid', {}) }],
    });

    const result = parseTrace(input);
    expect(result.events[0]?.messageType).toBe('CallError');
    expect(result.events[0]?.errorCode).toBe('SecurityError');
    expect(result.events[0]?.errorDescription).toBe('Certificate invalid');
  });

  it('preserves rawMessage', () => {
    const rawMsg = call('m1', 'BootNotification', { vendor: 'Test' });
    const input = JSON.stringify({
      events: [{ message: rawMsg }],
    });

    const result = parseTrace(input);
    expect(result.events[0]?.rawMessage).toEqual(rawMsg);
  });
});

// ---------------------------------------------------------------------------
// Limits and security
// ---------------------------------------------------------------------------

describe('parseTrace — limits and security', () => {
  it('throws on input exceeding size limit', () => {
    // Create a string that exceeds MAX_INPUT_SIZE_BYTES
    const huge = 'x'.repeat(MAX_INPUT_SIZE_BYTES + 1);
    expect(() => parseTrace(huge)).toThrow(ParseError);
    expect(() => parseTrace(huge)).toThrow(/exceeds the maximum allowed size/);
  });

  it('throws on event count exceeding limit', () => {
    // Create a trace with MAX_EVENT_COUNT + 1 events
    const events = Array.from({ length: MAX_EVENT_COUNT + 1 }, (_, i) => ({
      message: call(`m${i}`, 'BootNotification'),
    }));
    const input = JSON.stringify({ events });

    expect(() => parseTrace(input)).toThrow(ParseError);
    expect(() => parseTrace(input)).toThrow(/exceeds the maximum allowed count/);
  });

  it('handles prototype pollution attempts safely', () => {
    const input = JSON.stringify({
      events: [{ message: call('m1', 'BootNotification') }],
      __proto__: { polluted: true },
    });

    const result = parseTrace(input);
    expect(result.events).toHaveLength(1);
    // The prototype should not be polluted
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('does not reorder out-of-order events', () => {
    const input = JSON.stringify({
      events: [
        { timestamp: '2024-01-15T10:01:00.000Z', message: call('m2', 'Heartbeat') },
        { timestamp: '2024-01-15T10:00:00.000Z', message: call('m1', 'BootNotification') },
      ],
    });

    const result = parseTrace(input);
    // Events should stay in original order (ADR-0005)
    expect(result.events[0]?.messageId).toBe('m2');
    expect(result.events[1]?.messageId).toBe('m1');
    // But timestamps should be normalized correctly
    expect(result.events[0]?.timestamp).toBeGreaterThan(result.events[1]?.timestamp ?? 0);
  });
});

// ---------------------------------------------------------------------------
// Existing fixtures
// ---------------------------------------------------------------------------

describe('parseTrace — existing fixtures', () => {
  it('parses normal-session fixture', async () => {
    const { normalSession } = await import('./fixtures/index.js');
    const input = JSON.stringify(normalSession);
    const result = parseTrace(input);
    expect(result.events.length).toBe(normalSession.events.length);
    expect(result.warnings).toHaveLength(0);
  });

  it('parses failed-auth fixture', async () => {
    const { failedAuth } = await import('./fixtures/index.js');
    const input = JSON.stringify(failedAuth);
    const result = parseTrace(input);
    expect(result.events.length).toBe(failedAuth.events.length);
    expect(result.warnings).toHaveLength(0);
  });

  it('parses connector-fault fixture', async () => {
    const { connectorFault } = await import('./fixtures/index.js');
    const input = JSON.stringify(connectorFault);
    const result = parseTrace(input);
    expect(result.events.length).toBe(connectorFault.events.length);
    expect(result.warnings).toHaveLength(0);
  });
});
