/**
 * Unit tests for the Open OCPP Trace adapter: detection, direction mapping,
 * action derivation, raw precedence, unknown-field tolerance, malformed-record
 * handling, and the untrusted-input limits.
 */

import { describe, it, expect } from 'vitest';
import {
  parseOpenOcppTrace,
  deriveOpenOcppTraceView,
  looksLikeOpenOcppTrace,
} from './openOcppTrace.js';
import { parseTrace, ParseError, MAX_INPUT_SIZE_BYTES } from './parser.js';

/** A minimal well-formed boot exchange in the Open OCPP Trace format (JSONL). */
const bootExchange = [
  JSON.stringify({
    schemaVersion: '1.1',
    timestamp: '2024-01-15T10:00:00.000Z',
    ocppVersion: '1.6',
    transport: 'json',
    chargePointId: 'CP1',
    direction: 'cp-to-csms',
    messageType: 'CALL',
    messageId: 'm1',
    action: 'BootNotification',
    payload: { chargePointVendor: 'V', chargePointModel: 'M' },
    raw: '[2,"m1","BootNotification",{"chargePointVendor":"V","chargePointModel":"M"}]',
  }),
  JSON.stringify({
    schemaVersion: '1.1',
    timestamp: '2024-01-15T10:00:00.500Z',
    transport: 'json',
    direction: 'csms-to-cp',
    messageType: 'CALLRESULT',
    messageId: 'm1',
    payload: { status: 'Accepted' },
    raw: '[3,"m1",{"status":"Accepted"}]',
  }),
].join('\n');

describe('looksLikeOpenOcppTrace', () => {
  it('recognizes JSONL records', () => {
    expect(looksLikeOpenOcppTrace(bootExchange)).toBe(true);
  });

  it('recognizes a JSON array of records', () => {
    const arr = JSON.stringify(bootExchange.split('\n').map((l) => JSON.parse(l)));
    expect(looksLikeOpenOcppTrace(arr)).toBe(true);
  });

  it('rejects the internal bare-array format', () => {
    expect(looksLikeOpenOcppTrace('[[2,"m1","Heartbeat",{}]]')).toBe(false);
  });

  it('rejects the internal JSONL format (message array, internal direction)', () => {
    const internal = JSON.stringify({
      direction: 'CS_TO_CSMS',
      message: [2, 'm1', 'Heartbeat', {}],
    });
    expect(looksLikeOpenOcppTrace(internal)).toBe(false);
  });

  it('rejects non-JSON and empty input', () => {
    expect(looksLikeOpenOcppTrace('not json')).toBe(false);
    expect(looksLikeOpenOcppTrace('')).toBe(false);
  });
});

describe('parseOpenOcppTrace - direction mapping', () => {
  it('maps cp-to-csms and csms-to-cp to the internal directions', () => {
    const { events, warnings } = parseOpenOcppTrace(bootExchange);
    expect(warnings).toEqual([]);
    expect(events).toHaveLength(2);
    expect(events[0]?.direction).toBe('CS_TO_CSMS');
    expect(events[1]?.direction).toBe('CSMS_TO_CS');
  });
});

describe('parseTrace - auto-detection', () => {
  it('delegates the Open OCPP Trace format to its parser', () => {
    expect(parseTrace(bootExchange)).toEqual(parseOpenOcppTrace(bootExchange));
  });

  it('still parses the internal formats', () => {
    const internal = JSON.stringify({
      events: [{ direction: 'CS_TO_CSMS', message: [2, 'm1', 'Heartbeat', {}] }],
    });
    const result = parseTrace(internal);
    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.action).toBe('Heartbeat');
  });
});

describe('parseOpenOcppTrace - action derivation', () => {
  it('derives a response action from its correlated CALL', () => {
    const view = deriveOpenOcppTraceView(bootExchange);
    const response = view.records[1];
    expect(response?.messageType).toBe('CALLRESULT');
    expect(response?.action).toBe('BootNotification');
    expect(response?.correlatesWith).toBe(0);
    expect(view.unansweredCalls).toEqual([]);
    expect(view.orphanResponses).toEqual([]);
  });

  it('reports an unanswered CALL', () => {
    const oneCall = JSON.stringify({
      schemaVersion: '1.1',
      timestamp: '2024-01-15T10:00:00.000Z',
      transport: 'json',
      direction: 'cp-to-csms',
      messageType: 'CALL',
      messageId: 'm9',
      action: 'Heartbeat',
      payload: {},
    });
    const view = deriveOpenOcppTraceView(oneCall);
    expect(view.unansweredCalls).toEqual([0]);
    expect(view.orphanResponses).toEqual([]);
  });
});

describe('parseOpenOcppTrace - raw precedence', () => {
  it('uses raw when it disagrees with the decomposed fields, and warns', () => {
    const record = JSON.stringify({
      schemaVersion: '1.1',
      timestamp: '2024-01-15T10:00:00.000Z',
      transport: 'json',
      direction: 'cp-to-csms',
      messageType: 'CALL',
      messageId: 'm1',
      action: 'Heartbeat',
      payload: {},
      // raw carries a different action than the `action` field.
      raw: '[2,"m1","BootNotification",{}]',
    });
    const { events, warnings } = parseOpenOcppTrace(record);
    expect(events).toHaveLength(1);
    // raw wins.
    expect(events[0]?.action).toBe('BootNotification');
    expect(warnings.some((w) => w.message.includes('disagrees'))).toBe(true);
  });

  it('falls back to the decomposed fields when raw is not valid JSON', () => {
    const record = JSON.stringify({
      schemaVersion: '1.1',
      timestamp: '2024-01-15T10:00:00.000Z',
      transport: 'json',
      direction: 'cp-to-csms',
      messageType: 'CALL',
      messageId: 'm1',
      action: 'Heartbeat',
      payload: {},
      raw: '[2,"m1","BootNotif', // truncated
    });
    const { events, warnings } = parseOpenOcppTrace(record);
    expect(events).toHaveLength(1);
    expect(events[0]?.action).toBe('Heartbeat');
    expect(warnings.some((w) => w.message.includes('not valid JSON'))).toBe(true);
  });
});

describe('parseOpenOcppTrace - tolerance and limits', () => {
  it('ignores unknown fields (forward compatibility)', () => {
    const record = JSON.stringify({
      schemaVersion: '1.1',
      timestamp: '2024-01-15T10:00:00.000Z',
      transport: 'json',
      direction: 'cp-to-csms',
      messageType: 'CALL',
      messageId: 'm1',
      action: 'Heartbeat',
      payload: {},
      raw: '[2,"m1","Heartbeat",{}]',
      futureField: { anything: true },
    });
    const { events, warnings } = parseOpenOcppTrace(record);
    expect(events).toHaveLength(1);
    expect(warnings).toEqual([]);
  });

  it('skips a malformed record with a warning and keeps the rest', () => {
    const input = [
      JSON.stringify({
        schemaVersion: '1.1',
        timestamp: '2024-01-15T10:00:00.000Z',
        transport: 'json',
        direction: 'cp-to-csms',
        messageType: 'CALL',
        messageId: 'm1',
        action: 'Heartbeat',
        payload: {},
        raw: '[2,"m1","Heartbeat",{}]',
      }),
      JSON.stringify({ not: 'a valid record' }),
    ].join('\n');
    const { events, warnings } = parseOpenOcppTrace(input);
    expect(events).toHaveLength(1);
    expect(warnings.length).toBeGreaterThanOrEqual(1);
  });

  it('throws when there are no usable records', () => {
    const input = JSON.stringify({ not: 'a record' });
    expect(() => parseOpenOcppTrace(input)).toThrow(ParseError);
  });

  it('enforces the input size limit', () => {
    const oversized = 'x'.repeat(MAX_INPUT_SIZE_BYTES + 1);
    expect(() => parseOpenOcppTrace(oversized)).toThrow(ParseError);
  });
});
