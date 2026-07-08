import { describe, it, expect } from 'vitest';
import {
  scenarios,
  scenarioNames,
  getScenario,
  normalSessionScenario,
  failedAuthScenario,
  connectorFaultScenario,
  stationOfflineScenario,
  unexpectedStopReasonScenario,
} from './index.js';
import { parseTrace, buildSessionTimeline, detectFailures } from '../core/index.js';

// ---------------------------------------------------------------------------
// Registry tests
// ---------------------------------------------------------------------------

describe('scenario registry', () => {
  it('exports exactly 5 scenarios', () => {
    expect(scenarios).toHaveLength(5);
  });

  it('exports scenario names in order', () => {
    expect(scenarioNames).toEqual([
      'normal-session',
      'failed-auth',
      'connector-fault',
      'station-offline',
      'unexpected-stop-reason',
    ]);
  });

  it('each scenario has a name, description, trace, and expectedFailures', () => {
    for (const scenario of scenarios) {
      expect(scenario.name).toBeTruthy();
      expect(typeof scenario.description).toBe('string');
      expect(scenario.trace).toBeDefined();
      expect(Array.isArray(scenario.expectedFailures)).toBe(true);
    }
  });

  it('getScenario returns the correct scenario by name', () => {
    expect(getScenario('normal-session')).toBe(normalSessionScenario);
    expect(getScenario('failed-auth')).toBe(failedAuthScenario);
    expect(getScenario('connector-fault')).toBe(connectorFaultScenario);
    expect(getScenario('station-offline')).toBe(stationOfflineScenario);
    expect(getScenario('unexpected-stop-reason')).toBe(unexpectedStopReasonScenario);
  });

  it('getScenario returns undefined for unknown name', () => {
    expect(getScenario('nonexistent')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Expected failures alignment (pitfall: scenarios must match v0.1 detection rules)
// ---------------------------------------------------------------------------

describe('expectedFailures alignment with v0.1 detection rules', () => {
  const VALID_FAILURE_CODES = new Set([
    'FAILED_AUTHORIZATION',
    'CONNECTOR_FAULT',
    'STATION_OFFLINE_DURING_SESSION',
  ]);

  it('all expectedFailures reference valid v0.1 failure codes', () => {
    for (const scenario of scenarios) {
      for (const code of scenario.expectedFailures) {
        expect(VALID_FAILURE_CODES.has(code)).toBe(true);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Engine integration — each scenario runs through the analysis engine
// ---------------------------------------------------------------------------

describe('scenario engine integration', () => {
  it('normal-session: no failures detected', () => {
    const trace = JSON.stringify(normalSessionScenario.trace);
    const result = parseTrace(trace);
    const sessions = buildSessionTimeline(result.events);
    const failures = detectFailures(result.events, sessions);
    expect(failures).toHaveLength(0);
  });

  it('failed-auth: detects FAILED_AUTHORIZATION', () => {
    const trace = JSON.stringify(failedAuthScenario.trace);
    const result = parseTrace(trace);
    const sessions = buildSessionTimeline(result.events);
    const failures = detectFailures(result.events, sessions);
    expect(failures.some((f) => f.code === 'FAILED_AUTHORIZATION')).toBe(true);
  });

  it('connector-fault: detects CONNECTOR_FAULT', () => {
    const trace = JSON.stringify(connectorFaultScenario.trace);
    const result = parseTrace(trace);
    const sessions = buildSessionTimeline(result.events);
    const failures = detectFailures(result.events, sessions);
    expect(failures.some((f) => f.code === 'CONNECTOR_FAULT')).toBe(true);
  });

  it('station-offline: detects STATION_OFFLINE_DURING_SESSION', () => {
    const trace = JSON.stringify(stationOfflineScenario.trace);
    const result = parseTrace(trace);
    const sessions = buildSessionTimeline(result.events);
    const failures = detectFailures(result.events, sessions);
    expect(failures.some((f) => f.code === 'STATION_OFFLINE_DURING_SESSION')).toBe(true);
  });

  it('unexpected-stop-reason: no failures detected (parser/timeline-only fixture)', () => {
    const trace = JSON.stringify(unexpectedStopReasonScenario.trace);
    const result = parseTrace(trace);
    const sessions = buildSessionTimeline(result.events);
    const failures = detectFailures(result.events, sessions);
    expect(failures).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Synthetic data policy
// ---------------------------------------------------------------------------

describe('synthetic data policy', () => {
  it.each(scenarios.map((s, i) => [s.name, i] as const))(
    '%s contains only synthetic identifiers',
    (name) => {
      const scenario = getScenario(name);
      expect(scenario).toBeDefined();
      const json = JSON.stringify(scenario);
      expect(json).toContain('SYNTHETIC');
      // Must not contain UUID-like patterns
      expect(json).not.toMatch(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i);
    },
  );

  it.each(scenarios.map((s, i) => [s.name, i] as const))('%s declares ocppVersion 1.6', (name) => {
    const scenario = getScenario(name);
    expect(scenario).toBeDefined();
    expect(scenario?.trace.metadata?.ocppVersion).toBe('1.6');
  });
});
