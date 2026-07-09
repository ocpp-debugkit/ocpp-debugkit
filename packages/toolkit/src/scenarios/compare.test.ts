import { describe, it, expect } from 'vitest';
import { compareScenarioReports } from './compare.js';
import type { ScenarioEvalResult } from '../core/index.js';

function makeResult(
  allPassed: boolean,
  detectedFailureCodes: string[],
  assertionsPassed: boolean[] = [],
): ScenarioEvalResult {
  return {
    assertions: assertionsPassed.map((passed, i) => ({
      assertion: { type: 'event_order' as const, params: { actions: [`action-${i}`] } },
      passed,
      message: `assertion ${i}`,
    })),
    allPassed,
    failures: detectedFailureCodes.map((code) => ({
      code: code as 'FAILED_AUTHORIZATION',
      description: `${code} failure`,
      severity: 'warning' as const,
      eventIds: [],
      suggestedSteps: [],
    })),
    detectedFailureCodes: detectedFailureCodes as 'FAILED_AUTHORIZATION'[],
    expectedFailuresPassed: allPassed,
  };
}

describe('compareScenarioReports', () => {
  it('reports both passed', () => {
    const a = makeResult(true, []);
    const b = makeResult(true, []);
    const result = compareScenarioReports(a, b);
    expect(result.bothPassed).toBe(true);
    expect(result.aPassed).toBe(true);
    expect(result.bPassed).toBe(true);
    expect(result.failuresOnlyInA).toHaveLength(0);
    expect(result.failuresOnlyInB).toHaveLength(0);
  });

  it('detects regression (A passed, B failed)', () => {
    const a = makeResult(true, []);
    const b = makeResult(false, ['FAILED_AUTHORIZATION']);
    const result = compareScenarioReports(a, b);
    expect(result.aPassed).toBe(true);
    expect(result.bPassed).toBe(false);
    expect(result.failuresOnlyInA).toHaveLength(0);
    expect(result.failuresOnlyInB).toContain('FAILED_AUTHORIZATION');
    expect(result.summary).toContain('regression');
  });

  it('detects improvement (A failed, B passed)', () => {
    const a = makeResult(false, ['FAILED_AUTHORIZATION']);
    const b = makeResult(true, []);
    const result = compareScenarioReports(a, b);
    expect(result.aPassed).toBe(false);
    expect(result.bPassed).toBe(true);
    expect(result.failuresOnlyInA).toContain('FAILED_AUTHORIZATION');
    expect(result.summary).toContain('improvement');
  });

  it('detects failure code changes', () => {
    const a = makeResult(false, ['FAILED_AUTHORIZATION', 'CONNECTOR_FAULT']);
    const b = makeResult(false, ['FAILED_AUTHORIZATION', 'METER_VALUE_GAP']);
    const result = compareScenarioReports(a, b);
    expect(result.failuresOnlyInA).toContain('CONNECTOR_FAULT');
    expect(result.failuresOnlyInB).toContain('METER_VALUE_GAP');
  });

  it('detects assertion result changes', () => {
    const a = makeResult(false, [], [true, false, true]);
    const b = makeResult(false, [], [true, true, false]);
    const result = compareScenarioReports(a, b);
    expect(result.changedAssertions).toHaveLength(2);
    expect(result.changedAssertions[0]?.assertionType).toBe('event_order');
    expect(result.changedAssertions[0]?.passedInA).toBe(false);
    expect(result.changedAssertions[0]?.passedInB).toBe(true);
  });

  it('reports both failed with same failures', () => {
    const a = makeResult(false, ['FAILED_AUTHORIZATION']);
    const b = makeResult(false, ['FAILED_AUTHORIZATION']);
    const result = compareScenarioReports(a, b);
    expect(result.bothPassed).toBe(false);
    expect(result.failuresOnlyInA).toHaveLength(0);
    expect(result.failuresOnlyInB).toHaveLength(0);
    expect(result.summary).toContain('Both scenarios failed');
  });
});
