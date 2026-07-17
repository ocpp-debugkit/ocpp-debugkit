/**
 * Conformance test: the vendored Open OCPP Trace specification fixtures.
 *
 * For each fixture, DebugKit (acting as a reference consumer) must derive the
 * exact consumer view the specification pins down in `expected.json`, and must
 * parse the trace into one normalized event per record. The fixtures are
 * vendored from https://github.com/open-ocpp-trace/specification; see the
 * README in the fixtures directory.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import {
  parseOpenOcppTrace,
  deriveOpenOcppTraceView,
  type OpenOcppTraceView,
} from './openOcppTrace.js';
import { toOpenOcppTraceJsonl, toOpenOcppTraceRecords } from './openOcppTraceExport.js';
import { buildSessionTimeline } from './timeline.js';
import { detectFailures } from './detection.js';

const fixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '__fixtures__',
  'open-ocpp-trace',
);

const fixtureNames = readdirSync(fixturesDir)
  .filter((name) => statSync(join(fixturesDir, name)).isDirectory())
  .sort();

const ajv = new Ajv2020({ allErrors: true });
addFormats(ajv);
const validateRecord = ajv.compile(
  JSON.parse(readFileSync(join(fixturesDir, 'trace-v1.schema.json'), 'utf8')),
);

describe('Open OCPP Trace conformance fixtures', () => {
  it('vendors the full 15-scenario corpus', () => {
    expect(fixtureNames).toHaveLength(15);
  });

  describe.each(fixtureNames)('%s', (name) => {
    const dir = join(fixturesDir, name);
    const trace = readFileSync(join(dir, 'trace.jsonl'), 'utf8');
    const expected = JSON.parse(
      readFileSync(join(dir, 'expected.json'), 'utf8'),
    ) as OpenOcppTraceView;

    it('derives the expected consumer view', () => {
      expect(deriveOpenOcppTraceView(trace)).toEqual(expected);
    });

    it('parses into one event per record with no warnings', () => {
      const result = parseOpenOcppTrace(trace);
      expect(result.warnings).toEqual([]);
      expect(result.events).toHaveLength(expected.counts.records);
    });

    it('preserves the verbatim frame from raw', () => {
      const result = parseOpenOcppTrace(trace);
      for (const event of result.events) {
        expect(Array.isArray(event.rawMessage)).toBe(true);
        expect(event.messageId).toBe(event.rawMessage[1]);
      }
    });

    it('flows through timeline and detection without throwing', () => {
      const result = parseOpenOcppTrace(trace);
      const sessions = buildSessionTimeline(result.events);
      expect(() => detectFailures(result.events, sessions)).not.toThrow();
    });

    it('round-trips: exporting the parsed events reproduces the expected consumer view', () => {
      const parsed = parseOpenOcppTrace(trace);
      const { jsonl, warnings } = toOpenOcppTraceJsonl(parsed.events);
      expect(warnings).toEqual([]);
      expect(deriveOpenOcppTraceView(jsonl)).toEqual(expected);
    });

    it('round-trips: every exported record validates against the published schema', () => {
      const parsed = parseOpenOcppTrace(trace);
      const { records } = toOpenOcppTraceRecords(parsed.events);
      expect(records).toHaveLength(expected.counts.records);
      for (const record of records) {
        const valid = validateRecord(record);
        expect(valid, ajv.errorsText(validateRecord.errors)).toBe(true);
      }
    });

    it('round-trips: re-parsing the export yields the same events', () => {
      const parsed = parseOpenOcppTrace(trace);
      const { jsonl } = toOpenOcppTraceJsonl(parsed.events);
      const reparsed = parseOpenOcppTrace(jsonl);
      expect(reparsed.warnings).toEqual([]);
      expect(reparsed.events).toEqual(parsed.events);
    });
  });
});
