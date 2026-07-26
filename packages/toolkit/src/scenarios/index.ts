/**
 * Scenario registry — exports all predefined scenarios.
 *
 * All scenario data is fully synthetic — no real station identifiers,
 * transaction IDs, idTag values, or personal data.
 */

import type { Scenario, Trace } from '../core/index.js';
import { fixtures } from '../core/index.js';

import stationOffline from './__scenarios__/station-offline.js';
import unexpectedStopReason from './__scenarios__/unexpected-stop-reason.js';
import meterValueGap from './__scenarios__/meter-value-gap.js';
import invalidStopReason from './__scenarios__/invalid-stop-reason.js';
import unexpectedStart from './__scenarios__/unexpected-start.js';
import statusTransitionViolation from './__scenarios__/status-transition-violation.js';
import diagnosticsFailure from './__scenarios__/diagnostics-failure.js';
import slowCsmsResponse from './__scenarios__/slow-csms-response.js';
import meterAnomaly from './__scenarios__/meter-anomaly.js';
import shortSession from './__scenarios__/short-session.js';
import heartbeatIrregular from './__scenarios__/heartbeat-irregular.js';
import unresponsiveCsms from './__scenarios__/unresponsive-csms.js';
import firmwareUpdateSuccess from './__scenarios__/firmware-update-success.js';

// ---------------------------------------------------------------------------
// Scenarios derived from core fixtures
// ---------------------------------------------------------------------------

const normalSessionScenario: Scenario = {
  name: 'normal-session',
  description:
    'Normal charging session: boot, authorize, start transaction, meter values, stop transaction. No failures expected.',
  trace: fixtures.normalSession as Trace,
  expectedFailures: [],
};

const failedAuthScenario: Scenario = {
  name: 'failed-auth',
  description:
    'Failed authorization: station prepares, idTag is rejected by CSMS. StartTransaction is not attempted. Expects FAILED_AUTHORIZATION failure.',
  trace: fixtures.failedAuth as Trace,
  expectedFailures: ['FAILED_AUTHORIZATION'],
};

const connectorFaultScenario: Scenario = {
  name: 'connector-fault',
  description:
    'Connector fault during active session: station boots, transaction starts, connector faults mid-charging, transaction stops with fault reason. Expects CONNECTOR_FAULT failure.',
  trace: fixtures.connectorFault as Trace,
  expectedFailures: ['CONNECTOR_FAULT'],
};

// ---------------------------------------------------------------------------
// Scenarios from fixture files
// ---------------------------------------------------------------------------

const stationOfflineScenario: Scenario = stationOffline as unknown as Scenario;
const unexpectedStopReasonScenario: Scenario = unexpectedStopReason as unknown as Scenario;
const meterValueGapScenario: Scenario = meterValueGap as unknown as Scenario;
const invalidStopReasonScenario: Scenario = invalidStopReason as unknown as Scenario;
const unexpectedStartScenario: Scenario = unexpectedStart as unknown as Scenario;
const statusTransitionViolationScenario: Scenario =
  statusTransitionViolation as unknown as Scenario;
const diagnosticsFailureScenario: Scenario = diagnosticsFailure as unknown as Scenario;
const slowCsmsResponseScenario: Scenario = slowCsmsResponse as unknown as Scenario;
const meterAnomalyScenario: Scenario = meterAnomaly as unknown as Scenario;
const shortSessionScenario: Scenario = shortSession as unknown as Scenario;
const heartbeatIrregularScenario: Scenario = heartbeatIrregular as unknown as Scenario;
const unresponsiveCsmsScenario: Scenario = unresponsiveCsms as unknown as Scenario;
const firmwareUpdateSuccessScenario: Scenario = firmwareUpdateSuccess as unknown as Scenario;

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const scenarios = [
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
] as const;

export const scenarioNames = [
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
] as const;

export {
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
};

export { compareScenarioReports } from './compare.js';
export type { ScenarioComparison } from './compare.js';

/**
 * Get a scenario by name.
 * @returns The scenario, or undefined if not found.
 */
export function getScenario(name: string): Scenario | undefined {
  return scenarios.find((s) => s.name === name);
}
