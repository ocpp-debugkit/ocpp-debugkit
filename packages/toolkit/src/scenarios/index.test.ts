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
  meterValueGapScenario,
  invalidStopReasonScenario,
  unexpectedStartScenario,
  statusTransitionViolationScenario,
  diagnosticsFailureScenario,
  slowCsmsResponseScenario,
  meterAnomalyScenario,
  shortSessionScenario,
  heartbeatIrregularScenario,
  unresponsiveCsmsScenario,
  firmwareUpdateSuccessScenario,
  firmwareUpdateFailureScenario,
  refusedAuthorizationScenario,
  heartbeatTimeoutScenario,
  repeatedBootNotificationScenario,
  meterValueZeroScenario,
  statusTransitionsLegalScenario,
  bootOutsideRepeatWindowScenario,
} from './index.js';
import { parseTrace, buildSessionTimeline, detectFailures } from '../core/index.js';

// ---------------------------------------------------------------------------
// Registry tests
// ---------------------------------------------------------------------------

describe('scenario registry', () => {
  it('exports exactly 23 scenarios', () => {
    expect(scenarios).toHaveLength(23);
  });

  it('exports scenario names in order', () => {
    expect(scenarioNames).toEqual([
      'normal-session',
      'failed-auth',
      'connector-fault',
      'station-offline',
      'unexpected-stop-reason',
      'meter-value-gap',
      'invalid-stop-reason',
      'unexpected-start',
      'status-transition-violation',
      'diagnostics-failure',
      'slow-csms-response',
      'meter-anomaly',
      'short-session',
      'heartbeat-irregular',
      'unresponsive-csms',
      'firmware-update-success',
      'firmware-update-failure',
      'refused-authorization',
      'heartbeat-timeout',
      'repeated-boot-notification',
      'meter-value-zero',
      'status-transitions-legal',
      'boot-outside-repeat-window',
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
    expect(getScenario('meter-value-gap')).toBe(meterValueGapScenario);
    expect(getScenario('invalid-stop-reason')).toBe(invalidStopReasonScenario);
    expect(getScenario('unexpected-start')).toBe(unexpectedStartScenario);
    expect(getScenario('status-transition-violation')).toBe(statusTransitionViolationScenario);
    expect(getScenario('diagnostics-failure')).toBe(diagnosticsFailureScenario);
    expect(getScenario('slow-csms-response')).toBe(slowCsmsResponseScenario);
    expect(getScenario('meter-anomaly')).toBe(meterAnomalyScenario);
    expect(getScenario('short-session')).toBe(shortSessionScenario);
    expect(getScenario('heartbeat-irregular')).toBe(heartbeatIrregularScenario);
    expect(getScenario('unresponsive-csms')).toBe(unresponsiveCsmsScenario);
    expect(getScenario('firmware-update-success')).toBe(firmwareUpdateSuccessScenario);
    expect(getScenario('firmware-update-failure')).toBe(firmwareUpdateFailureScenario);
    expect(getScenario('refused-authorization')).toBe(refusedAuthorizationScenario);
    expect(getScenario('heartbeat-timeout')).toBe(heartbeatTimeoutScenario);
    expect(getScenario('repeated-boot-notification')).toBe(repeatedBootNotificationScenario);
    expect(getScenario('meter-value-zero')).toBe(meterValueZeroScenario);
    expect(getScenario('status-transitions-legal')).toBe(statusTransitionsLegalScenario);
    expect(getScenario('boot-outside-repeat-window')).toBe(bootOutsideRepeatWindowScenario);
  });

  it('getScenario returns undefined for unknown name', () => {
    expect(getScenario('nonexistent')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Expected failures alignment with detection rules
// ---------------------------------------------------------------------------

describe('expectedFailures alignment with detection rules', () => {
  const VALID_FAILURE_CODES = new Set([
    'FAILED_AUTHORIZATION',
    'CONNECTOR_FAULT',
    'STATION_OFFLINE_DURING_SESSION',
    'TIMEOUT_NO_HEARTBEAT',
    'METER_VALUE_GAP',
    'INVALID_STOP_REASON',
    'UNEXPECTED_START',
    'STATUS_TRANSITION_VIOLATION',
    'DIAGNOSTICS_FAILURE',
    'FIRMWARE_UPDATE_FAILURE',
    'SUSPICIOUS_SESSION_DURATION',
    'SLOW_RESPONSE',
    'HEARTBEAT_INTERVAL_VIOLATION',
    'METER_VALUE_ANOMALY',
    'UNRESPONSIVE_CSMS',
    'REPEATED_BOOT_NOTIFICATION',
  ]);

  it('all expectedFailures reference valid failure codes', () => {
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

  it('meter-value-gap: detects METER_VALUE_GAP', () => {
    const trace = JSON.stringify(meterValueGapScenario.trace);
    const result = parseTrace(trace);
    const sessions = buildSessionTimeline(result.events);
    const failures = detectFailures(result.events, sessions);
    expect(failures.some((f) => f.code === 'METER_VALUE_GAP')).toBe(true);
  });

  it('invalid-stop-reason: detects INVALID_STOP_REASON', () => {
    const trace = JSON.stringify(invalidStopReasonScenario.trace);
    const result = parseTrace(trace);
    const sessions = buildSessionTimeline(result.events);
    const failures = detectFailures(result.events, sessions);
    expect(failures.some((f) => f.code === 'INVALID_STOP_REASON')).toBe(true);
  });

  it('unexpected-start: detects UNEXPECTED_START', () => {
    const trace = JSON.stringify(unexpectedStartScenario.trace);
    const result = parseTrace(trace);
    const sessions = buildSessionTimeline(result.events);
    const failures = detectFailures(result.events, sessions);
    expect(failures.some((f) => f.code === 'UNEXPECTED_START')).toBe(true);
  });

  it('status-transition-violation: detects STATUS_TRANSITION_VIOLATION', () => {
    const trace = JSON.stringify(statusTransitionViolationScenario.trace);
    const result = parseTrace(trace);
    const sessions = buildSessionTimeline(result.events);
    const failures = detectFailures(result.events, sessions);
    expect(failures.some((f) => f.code === 'STATUS_TRANSITION_VIOLATION')).toBe(true);
  });

  it('diagnostics-failure: detects DIAGNOSTICS_FAILURE', () => {
    const trace = JSON.stringify(diagnosticsFailureScenario.trace);
    const result = parseTrace(trace);
    const sessions = buildSessionTimeline(result.events);
    const failures = detectFailures(result.events, sessions);
    expect(failures.some((f) => f.code === 'DIAGNOSTICS_FAILURE')).toBe(true);
  });

  it('firmware-update-failure: detects FIRMWARE_UPDATE_FAILURE', () => {
    const trace = JSON.stringify(firmwareUpdateFailureScenario.trace);
    const result = parseTrace(trace);
    const sessions = buildSessionTimeline(result.events);
    const failures = detectFailures(result.events, sessions);
    expect(failures.some((f) => f.code === 'FIRMWARE_UPDATE_FAILURE')).toBe(true);
  });

  it('refused-authorization: detects FAILED_AUTHORIZATION for each non-Invalid refusal', () => {
    const trace = JSON.stringify(refusedAuthorizationScenario.trace);
    const result = parseTrace(trace);
    const sessions = buildSessionTimeline(result.events);
    const failures = detectFailures(result.events, sessions).filter(
      (f) => f.code === 'FAILED_AUTHORIZATION',
    );
    expect(failures).toHaveLength(3);
    expect(failures.map((f) => f.description.match(/"(\w+)" status/)?.[1])).toEqual([
      'Blocked',
      'Expired',
      'ConcurrentTx',
    ]);
  });

  it('heartbeat-timeout: detects TIMEOUT_NO_HEARTBEAT', () => {
    const trace = JSON.stringify(heartbeatTimeoutScenario.trace);
    const result = parseTrace(trace);
    const sessions = buildSessionTimeline(result.events);
    const failures = detectFailures(result.events, sessions);
    expect(failures.some((f) => f.code === 'TIMEOUT_NO_HEARTBEAT')).toBe(true);
  });

  it('repeated-boot-notification: detects REPEATED_BOOT_NOTIFICATION', () => {
    const trace = JSON.stringify(repeatedBootNotificationScenario.trace);
    const result = parseTrace(trace);
    const sessions = buildSessionTimeline(result.events);
    const failures = detectFailures(result.events, sessions);
    expect(failures.some((f) => f.code === 'REPEATED_BOOT_NOTIFICATION')).toBe(true);
  });

  it('meter-value-zero: no failures detected', () => {
    const trace = JSON.stringify(meterValueZeroScenario.trace);
    const result = parseTrace(trace);
    const sessions = buildSessionTimeline(result.events);
    const failures = detectFailures(result.events, sessions);
    expect(failures).toHaveLength(0);
  });

  it('status-transitions-legal: no failures detected', () => {
    const trace = JSON.stringify(statusTransitionsLegalScenario.trace);
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
