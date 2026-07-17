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
import {
  parseOpenOcppTrace,
  deriveOpenOcppTraceView,
  type OpenOcppTraceView,
} from './openOcppTrace.js';
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
  });
});
