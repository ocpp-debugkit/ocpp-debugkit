/**
 * Scenario assertions — declarative assertions for scenario evaluation.
 *
 * Supports 8 assertion types:
 * - event_order: verify events appear in a specific order
 * - event_count: verify the count of events (optionally filtered by action)
 * - payload_field: verify a payload field value on a specific action
 * - timing: verify timing gaps between two actions
 * - session_state: verify session status
 * - failure_severity: verify a specific failure has the expected severity
 * - no_failures: verify no failures are detected
 * - failure_count: verify the count of detected failures
 *
 * @module @ocpp-debugkit/toolkit/core
 */

import type {
  AssertionResult,
  Event,
  Failure,
  FailureCode,
  FailureSeverity,
  Scenario,
  ScenarioAssertion,
  ScenarioEvalResult,
  Session,
} from './types.js';
import { parseTrace } from './parser.js';
import { buildSessionTimeline } from './timeline.js';
import { detectFailures } from './detection.js';
import { summarizeSessions } from './summarizer.js';

// ---------------------------------------------------------------------------
// Deep equality (same limited implementation as diff.ts)
// ---------------------------------------------------------------------------

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, b[i]));
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const objA = a as Record<string, unknown>;
    const objB = b as Record<string, unknown>;
    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((key) => deepEqual(objA[key], objB[key]));
  }

  return false;
}

/** Safely access a nested field via dot notation (e.g., "idTagInfo.status"). */
function getNestedValue(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

// ---------------------------------------------------------------------------
// Assertion evaluators
// ---------------------------------------------------------------------------

/** Input for assertion evaluation. */
export interface AssertionContext {
  events: Event[];
  sessions: Session[];
  failures: Failure[];
}

/**
 * Evaluate a single assertion against the analysis context.
 */
export function runAssertion(assertion: ScenarioAssertion, ctx: AssertionContext): AssertionResult {
  switch (assertion.type) {
    case 'event_order':
      return evalEventOrder(assertion, ctx);
    case 'event_count':
      return evalEventCount(assertion, ctx);
    case 'payload_field':
      return evalPayloadField(assertion, ctx);
    case 'timing':
      return evalTiming(assertion, ctx);
    case 'session_state':
      return evalSessionState(assertion, ctx);
    case 'failure_severity':
      return evalFailureSeverity(assertion, ctx);
    case 'no_failures':
      return evalNoFailures(assertion, ctx);
    case 'failure_count':
      return evalFailureCount(assertion, ctx);
    default:
      return {
        assertion,
        passed: false,
        message: `Unknown assertion type: ${(assertion as { type: string }).type}`,
      };
  }
}

function evalEventOrder(
  assertion: { type: 'event_order'; params: { actions: string[] } },
  ctx: AssertionContext,
): AssertionResult {
  const { actions } = assertion.params;
  const callActions = ctx.events
    .filter((e) => e.messageType === 'Call' && e.action !== null)
    .map((e) => e.action as string);

  // Check if actions appear in order (not necessarily consecutive)
  let searchFrom = 0;
  for (const action of actions) {
    const foundIndex = callActions.indexOf(action, searchFrom);
    if (foundIndex === -1) {
      return {
        assertion,
        passed: false,
        message: `Expected action "${action}" in order after previous actions, but not found`,
      };
    }
    searchFrom = foundIndex + 1;
  }

  return {
    assertion,
    passed: true,
    message: `Actions [${actions.join(', ')}] appear in the correct order`,
  };
}

function evalEventCount(
  assertion: { type: 'event_count'; params: { min?: number; max?: number; action?: string } },
  ctx: AssertionContext,
): AssertionResult {
  const { min, max, action } = assertion.params;
  const count = action
    ? ctx.events.filter((e) => e.messageType === 'Call' && e.action === action).length
    : ctx.events.length;

  if (min !== undefined && count < min) {
    return {
      assertion,
      passed: false,
      message: `Expected at least ${min} ${action ? `"${action}" ` : ''}events, got ${count}`,
    };
  }

  if (max !== undefined && count > max) {
    return {
      assertion,
      passed: false,
      message: `Expected at most ${max} ${action ? `"${action}" ` : ''}events, got ${count}`,
    };
  }

  return {
    assertion,
    passed: true,
    message: `Event count ${count} is within range [${min ?? 0}, ${max ?? '∞'}]${action ? ` for "${action}"` : ''}`,
  };
}

function evalPayloadField(
  assertion: {
    type: 'payload_field';
    params: { action: string; field: string; equals?: unknown; contains?: unknown };
  },
  ctx: AssertionContext,
): AssertionResult {
  const { action, field, equals, contains } = assertion.params;
  const matchingEvents = ctx.events.filter((e) => e.messageType === 'Call' && e.action === action);

  if (matchingEvents.length === 0) {
    return {
      assertion,
      passed: false,
      message: `No events with action "${action}" found`,
    };
  }

  for (const event of matchingEvents) {
    const value = getNestedValue(event.payload, field);
    if (value === undefined) {
      return {
        assertion,
        passed: false,
        message: `Field "${field}" not found in payload of "${action}" event`,
      };
    }

    if (equals !== undefined && !deepEqual(value, equals)) {
      return {
        assertion,
        passed: false,
        message: `Field "${field}" in "${action}" expected to equal ${JSON.stringify(equals)}, got ${JSON.stringify(value)}`,
      };
    }

    if (contains !== undefined) {
      if (Array.isArray(value) && !value.some((v) => deepEqual(v, contains))) {
        return {
          assertion,
          passed: false,
          message: `Field "${field}" in "${action}" expected to contain ${JSON.stringify(contains)}, got ${JSON.stringify(value)}`,
        };
      }
      if (typeof value === 'string' && !value.includes(String(contains))) {
        return {
          assertion,
          passed: false,
          message: `Field "${field}" in "${action}" expected to contain "${contains}", got "${value}"`,
        };
      }
    }
  }

  return {
    assertion,
    passed: true,
    message: `Payload field "${field}" in "${action}" matches expectations`,
  };
}

function evalTiming(
  assertion: {
    type: 'timing';
    params: { actionA: string; actionB: string; maxGapMs?: number; minGapMs?: number };
  },
  ctx: AssertionContext,
): AssertionResult {
  const { actionA, actionB, maxGapMs, minGapMs } = assertion.params;

  const eventA = ctx.events.find(
    (e) => e.messageType === 'Call' && e.action === actionA && e.timestamp !== null,
  );
  const eventB = ctx.events.find(
    (e) => e.messageType === 'Call' && e.action === actionB && e.timestamp !== null,
  );

  if (!eventA || eventA.timestamp === null) {
    return {
      assertion,
      passed: false,
      message: `Action "${actionA}" not found or has no timestamp`,
    };
  }
  if (!eventB || eventB.timestamp === null) {
    return {
      assertion,
      passed: false,
      message: `Action "${actionB}" not found or has no timestamp`,
    };
  }

  const gap = eventB.timestamp - eventA.timestamp;

  if (maxGapMs !== undefined && gap > maxGapMs) {
    return {
      assertion,
      passed: false,
      message: `Gap between "${actionA}" and "${actionB}" is ${gap}ms, exceeds max ${maxGapMs}ms`,
    };
  }

  if (minGapMs !== undefined && gap < minGapMs) {
    return {
      assertion,
      passed: false,
      message: `Gap between "${actionA}" and "${actionB}" is ${gap}ms, below min ${minGapMs}ms`,
    };
  }

  return {
    assertion,
    passed: true,
    message: `Gap between "${actionA}" and "${actionB}" is ${gap}ms (within range)`,
  };
}

function evalSessionState(
  assertion: { type: 'session_state'; params: { expected: 'active' | 'completed' | 'aborted' } },
  ctx: AssertionContext,
): AssertionResult {
  const { expected } = assertion.params;

  if (ctx.sessions.length === 0) {
    return { assertion, passed: false, message: 'No sessions found' };
  }

  for (const session of ctx.sessions) {
    if (session.status !== expected) {
      return {
        assertion,
        passed: false,
        message: `Session ${session.sessionId} has status "${session.status}", expected "${expected}"`,
      };
    }
  }

  return {
    assertion,
    passed: true,
    message: `All sessions have status "${expected}"`,
  };
}

function evalFailureSeverity(
  assertion: { type: 'failure_severity'; params: { code: FailureCode; severity: FailureSeverity } },
  ctx: AssertionContext,
): AssertionResult {
  const { code, severity } = assertion.params;
  const matching = ctx.failures.find((f) => f.code === code);

  if (!matching) {
    return {
      assertion,
      passed: false,
      message: `Failure with code "${code}" not detected`,
    };
  }

  if (matching.severity !== severity) {
    return {
      assertion,
      passed: false,
      message: `Failure "${code}" has severity "${matching.severity}", expected "${severity}"`,
    };
  }

  return {
    assertion,
    passed: true,
    message: `Failure "${code}" has severity "${severity}" as expected`,
  };
}

function evalNoFailures(
  assertion: { type: 'no_failures'; params: Record<string, never> },
  ctx: AssertionContext,
): AssertionResult {
  if (ctx.failures.length > 0) {
    return {
      assertion,
      passed: false,
      message: `Expected no failures, but ${ctx.failures.length} detected: ${ctx.failures.map((f) => f.code).join(', ')}`,
    };
  }

  return { assertion, passed: true, message: 'No failures detected as expected' };
}

function evalFailureCount(
  assertion: { type: 'failure_count'; params: { min?: number; max?: number; code?: FailureCode } },
  ctx: AssertionContext,
): AssertionResult {
  const { min, max, code } = assertion.params;
  const count = code ? ctx.failures.filter((f) => f.code === code).length : ctx.failures.length;

  if (min !== undefined && count < min) {
    return {
      assertion,
      passed: false,
      message: `Expected at least ${min} ${code ? `"${code}" ` : ''}failures, got ${count}`,
    };
  }

  if (max !== undefined && count > max) {
    return {
      assertion,
      passed: false,
      message: `Expected at most ${max} ${code ? `"${code}" ` : ''}failures, got ${count}`,
    };
  }

  return {
    assertion,
    passed: true,
    message: `Failure count ${count} ${code ? `for "${code}" ` : ''}is within range [${min ?? 0}, ${max ?? '∞'}]`,
  };
}

// ---------------------------------------------------------------------------
// Batch evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluate multiple assertions against the analysis context.
 */
export function runAssertions(
  ctx: AssertionContext,
  assertions: ScenarioAssertion[],
): AssertionResult[] {
  return assertions.map((assertion) => runAssertion(assertion, ctx));
}

/**
 * Evaluate a scenario: parse the trace, run detection, evaluate assertions,
 * and compare detected vs expected failures.
 */
export function evaluateScenario(scenario: Scenario): ScenarioEvalResult {
  const { events } = parseTrace(JSON.stringify(scenario.trace));
  const sessions = buildSessionTimeline(events);
  const failures = detectFailures(events, sessions);
  const detectedFailureCodes = [...new Set(failures.map((f) => f.code))];

  // Compare detected vs expected failures (deduplicated)
  const sortedDetected = [...detectedFailureCodes].sort();
  const sortedExpected = [...scenario.expectedFailures].sort();
  const expectedFailuresPassed = JSON.stringify(sortedDetected) === JSON.stringify(sortedExpected);

  // Evaluate assertions
  const ctx: AssertionContext = { events, sessions, failures };
  const assertions = scenario.assertions ? runAssertions(ctx, scenario.assertions) : [];

  // Use summaries to ensure sessions are properly evaluated
  summarizeSessions(sessions, failures);

  const allPassed =
    expectedFailuresPassed && (assertions.length === 0 || assertions.every((a) => a.passed));

  return {
    assertions,
    allPassed,
    failures,
    detectedFailureCodes,
    expectedFailuresPassed,
  };
}
