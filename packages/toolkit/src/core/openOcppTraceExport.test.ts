/**
 * Unit tests for the Open OCPP Trace exporter: field mapping per message
 * type, timestamp and direction requirements (skip-and-flag), response
 * action back-fill, connectorId lifting, trace-level options, raw fidelity,
 * and schema validity of everything emitted.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { toOpenOcppTraceRecords, toOpenOcppTraceJsonl } from './openOcppTraceExport.js';
import { parseTrace } from './parser.js';
import { normalSession } from './fixtures/index.js';
import type { Event } from './types.js';

const schemaPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '__fixtures__',
  'open-ocpp-trace',
  'trace-v1.schema.json',
);
const ajv = new Ajv2020({ allErrors: true });
addFormats(ajv);
const validateRecord = ajv.compile(JSON.parse(readFileSync(schemaPath, 'utf8')));

function event(overrides: Partial<Event>): Event {
  return {
    id: 'evt-0001',
    messageId: 'm1',
    timestamp: Date.parse('2024-01-15T10:00:00.000Z'),
    direction: 'CS_TO_CSMS',
    messageType: 'Call',
    action: 'Heartbeat',
    payload: {},
    errorCode: null,
    errorDescription: null,
    rawMessage: [2, 'm1', 'Heartbeat', {}],
    ...overrides,
  };
}

describe('toOpenOcppTraceRecords - field mapping', () => {
  it('maps a CALL with direction, ISO timestamp, action, payload, and raw', () => {
    const { records, warnings } = toOpenOcppTraceRecords([event({})]);
    expect(warnings).toEqual([]);
    expect(records).toEqual([
      {
        schemaVersion: '1.1',
        timestamp: '2024-01-15T10:00:00.000Z',
        transport: 'json',
        direction: 'cp-to-csms',
        messageType: 'CALL',
        messageId: 'm1',
        action: 'Heartbeat',
        payload: {},
        raw: '[2,"m1","Heartbeat",{}]',
      },
    ]);
  });

  it('maps a CALLERROR into the error object with no payload', () => {
    const err = event({
      direction: 'CSMS_TO_CS',
      messageType: 'CallError',
      action: null,
      payload: { reason: 'x' },
      errorCode: 'InternalError',
      errorDescription: 'boom',
      rawMessage: [4, 'm1', 'InternalError', 'boom', { reason: 'x' }],
    });
    const { records } = toOpenOcppTraceRecords([err]);
    const record = records[0];
    expect(record?.messageType).toBe('CALLERROR');
    expect(record?.error).toEqual({
      code: 'InternalError',
      description: 'boom',
      details: { reason: 'x' },
    });
    expect(record?.payload).toBeUndefined();
    expect(record?.direction).toBe('csms-to-cp');
  });

  it('back-fills a response action from its correlated CALL', () => {
    const call = event({});
    const result = event({
      id: 'evt-0002',
      direction: 'CSMS_TO_CS',
      messageType: 'CallResult',
      action: null,
      payload: { ok: true },
      rawMessage: [3, 'm1', { ok: true }],
    });
    const { records } = toOpenOcppTraceRecords([call, result]);
    expect(records[1]?.action).toBe('Heartbeat');
    expect(records[1]?.payload).toEqual({ ok: true });
  });

  it('lifts a top-level integer connectorId from a CALL payload', () => {
    const status = event({
      action: 'StatusNotification',
      payload: { connectorId: 1, status: 'Available', errorCode: 'NoError' },
      rawMessage: [
        2,
        'm1',
        'StatusNotification',
        { connectorId: 1, status: 'Available', errorCode: 'NoError' },
      ],
    });
    const { records } = toOpenOcppTraceRecords([status]);
    expect(records[0]?.connectorId).toBe(1);
  });

  it('stamps trace-level options on every record', () => {
    const { records } = toOpenOcppTraceRecords([event({})], {
      ocppVersion: '1.6',
      chargePointId: 'CS-SYNTHETIC-001',
    });
    expect(records[0]?.ocppVersion).toBe('1.6');
    expect(records[0]?.chargePointId).toBe('CS-SYNTHETIC-001');
  });
});

describe('toOpenOcppTraceRecords - skip-and-flag', () => {
  it('skips an event with UNKNOWN direction and warns', () => {
    const { records, warnings } = toOpenOcppTraceRecords([event({ direction: 'UNKNOWN' })]);
    expect(records).toEqual([]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.message).toContain('direction is unknown');
  });

  it('skips an event with no timestamp and warns', () => {
    const { records, warnings } = toOpenOcppTraceRecords([event({ timestamp: null })]);
    expect(records).toEqual([]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.message).toContain('no timestamp');
  });

  it('keeps exportable events when others are skipped', () => {
    const { records, warnings } = toOpenOcppTraceRecords([
      event({ direction: 'UNKNOWN' }),
      event({ id: 'evt-0002', messageId: 'm2', rawMessage: [2, 'm2', 'Heartbeat', {}] }),
    ]);
    expect(records).toHaveLength(1);
    expect(records[0]?.messageId).toBe('m2');
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.index).toBe(0);
  });
});

describe('toOpenOcppTraceJsonl', () => {
  it('emits one record per line with a trailing newline', () => {
    const { jsonl } = toOpenOcppTraceJsonl([
      event({}),
      event({ id: 'evt-0002', messageId: 'm2', rawMessage: [2, 'm2', 'Heartbeat', {}] }),
    ]);
    expect(jsonl.endsWith('\n')).toBe(true);
    expect(jsonl.trimEnd().split('\n')).toHaveLength(2);
  });

  it('emits an empty string for no exportable events', () => {
    const { jsonl } = toOpenOcppTraceJsonl([event({ timestamp: null })]);
    expect(jsonl).toBe('');
  });
});

describe('exporter - schema validity and raw fidelity', () => {
  it('every record exported from an internal-format trace validates against the published schema', () => {
    const parsed = parseTrace(JSON.stringify(normalSession));
    const { records, warnings } = toOpenOcppTraceRecords(parsed.events, {
      ocppVersion: '1.6',
      chargePointId: 'CS-SYNTHETIC-001',
    });
    expect(warnings).toEqual([]);
    expect(records).toHaveLength(parsed.events.length);
    for (const record of records) {
      const valid = validateRecord(record);
      expect(valid, ajv.errorsText(validateRecord.errors)).toBe(true);
    }
  });

  it('raw decodes to exactly the fields each record decomposes', () => {
    const parsed = parseTrace(JSON.stringify(normalSession));
    const { records } = toOpenOcppTraceRecords(parsed.events);
    for (const record of records) {
      const frame = JSON.parse(record.raw as string) as unknown[];
      const expectedType = { 2: 'CALL', 3: 'CALLRESULT', 4: 'CALLERROR' }[frame[0] as number];
      expect(record.messageType).toBe(expectedType);
      expect(record.messageId).toBe(frame[1]);
      if (record.messageType === 'CALL') {
        expect(record.action).toBe(frame[2]);
        expect(record.payload).toEqual(frame[3]);
      } else if (record.messageType === 'CALLRESULT') {
        expect(record.payload).toEqual(frame[2]);
      }
    }
  });
});
