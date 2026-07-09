/**
 * Scenario comparison — compare two scenario evaluation results.
 *
 * Useful for regression testing: did the fix change the detected failures?
 * Compare a "before" run against an "after" run to see what changed.
 *
 * @module @ocpp-debugkit/toolkit/scenarios
 */

import type { FailureCode, ScenarioEvalResult } from '../core/index.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Result of comparing two scenario evaluation reports. */
export interface ScenarioComparison {
  /** Whether both scenarios passed all assertions. */
  bothPassed: boolean;
  /** Whether the first scenario (a) passed. */
  aPassed: boolean;
  /** Whether the second scenario (b) passed. */
  bPassed: boolean;
  /** Failure codes detected in A but not B. */
  failuresOnlyInA: FailureCode[];
  /** Failure codes detected in B but not A. */
  failuresOnlyInB: FailureCode[];
  /** Assertion results that changed (passed→failed or failed→passed). */
  changedAssertions: {
    assertionType: string;
    passedInA: boolean;
    passedInB: boolean;
  }[];
  /** Human-readable summary of changes. */
  summary: string;
}

// ---------------------------------------------------------------------------
// Comparison
// ---------------------------------------------------------------------------

/**
 * Compare two scenario evaluation results.
 *
 * @param a - First scenario evaluation result
 * @param b - Second scenario evaluation result
 * @returns A {@link ScenarioComparison} describing the differences
 */
export function compareScenarioReports(
  a: ScenarioEvalResult,
  b: ScenarioEvalResult,
): ScenarioComparison {
  const aPassed = a.allPassed;
  const bPassed = b.allPassed;
  const bothPassed = aPassed && bPassed;

  // Failure code diff
  const aCodes = new Set(a.detectedFailureCodes);
  const bCodes = new Set(b.detectedFailureCodes);
  const failuresOnlyInA = a.detectedFailureCodes.filter((c) => !bCodes.has(c));
  const failuresOnlyInB = b.detectedFailureCodes.filter((c) => !aCodes.has(c));

  // Assertion diff — compare assertions at the same index
  const maxLen = Math.max(a.assertions.length, b.assertions.length);
  const changedAssertions: {
    assertionType: string;
    passedInA: boolean;
    passedInB: boolean;
  }[] = [];

  for (let i = 0; i < maxLen; i++) {
    const aResult = a.assertions[i];
    const bResult = b.assertions[i];
    if (!aResult || !bResult) continue;

    if (aResult.passed !== bResult.passed) {
      changedAssertions.push({
        assertionType: aResult.assertion.type,
        passedInA: aResult.passed,
        passedInB: bResult.passed,
      });
    }
  }

  // Summary
  const parts: string[] = [];
  if (aPassed && !bPassed) {
    parts.push('Scenario A passed but B failed — regression detected');
  } else if (!aPassed && bPassed) {
    parts.push('Scenario A failed but B passed — improvement detected');
  } else if (bothPassed) {
    parts.push('Both scenarios passed all assertions');
  } else {
    parts.push('Both scenarios failed');
  }

  if (failuresOnlyInA.length > 0) {
    parts.push(`Failures only in A: ${failuresOnlyInA.join(', ')}`);
  }
  if (failuresOnlyInB.length > 0) {
    parts.push(`Failures only in B: ${failuresOnlyInB.join(', ')}`);
  }
  if (changedAssertions.length > 0) {
    parts.push(`${changedAssertions.length} assertion(s) changed result`);
  }

  return {
    bothPassed,
    aPassed,
    bPassed,
    failuresOnlyInA,
    failuresOnlyInB,
    changedAssertions,
    summary: parts.join('. '),
  };
}
