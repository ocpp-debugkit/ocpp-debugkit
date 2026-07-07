/**
 * `ocpp-debugkit scenario list` and `ocpp-debugkit scenario run <name>` commands.
 *
 * `scenario run` runs built-in static fixtures through the local analysis
 * engine only — it is NOT active endpoint testing, WebSocket simulation,
 * live station/CSMS testing, or the v0.2 scenario evaluator.
 */

import { parseTrace, buildSessionTimeline, detectFailures, ParseError } from '@ocpp-debugkit/core';
import { scenarioNames, getScenario } from '@ocpp-debugkit/scenarios';
import { CliError } from '../utils.js';

export function scenarioListCommand(): void {
  console.log('');
  console.log('═'.repeat(60));
  console.log('  Available Scenarios');
  console.log('═'.repeat(60));
  console.log('');

  for (const name of scenarioNames) {
    const scenario = getScenario(name);
    if (scenario) {
      console.log(`  ${name}`);
      console.log(`    ${scenario.description}`);
      if (scenario.expectedFailures.length > 0) {
        console.log(`    Expected failures: ${scenario.expectedFailures.join(', ')}`);
      } else {
        console.log(`    Expected failures: none`);
      }
      console.log('');
    }
  }

  console.log('Run with: ocpp-debugkit scenario run <name>');
  console.log('');
}

export async function scenarioRunCommand(name: string): Promise<void> {
  const scenario = getScenario(name);

  if (!scenario) {
    throw new CliError(
      `Scenario "${name}" not found. Run "ocpp-debugkit scenario list" to see available scenarios.`,
    );
  }

  console.log('');
  console.log('═'.repeat(60));
  console.log(`  Running Scenario: ${scenario.name}`);
  console.log('═'.repeat(60));
  console.log(`  ${scenario.description}`);
  console.log('');

  const traceContent = JSON.stringify(scenario.trace);

  let result;
  try {
    result = parseTrace(traceContent);
  } catch (e) {
    if (e instanceof ParseError) {
      throw new CliError(e.message);
    }
    if (e instanceof Error) {
      throw new CliError(e.message);
    }
    throw new CliError('Unknown error during parsing');
  }

  const sessions = buildSessionTimeline(result.events);
  const failures = detectFailures(result.events, sessions);

  // Compare detected vs expected failures
  const detectedCodes = new Set<string>(failures.map((f) => f.code));
  const expectedCodes = new Set<string>(scenario.expectedFailures);

  const correctlyDetected = [...expectedCodes].filter((c) => detectedCodes.has(c));
  const unexpectedFailures = [...detectedCodes].filter((c) => !expectedCodes.has(c));
  const missedFailures = [...expectedCodes].filter((c) => !detectedCodes.has(c));

  console.log('── Results ─────────────────────────────────────────────');
  console.log(`  Events:    ${result.events.length}`);
  console.log(`  Sessions:  ${sessions.length}`);
  console.log(`  Failures:  ${failures.length}`);
  console.log('');

  if (correctlyDetected.length > 0) {
    console.log(`  ✅ Correctly detected: ${correctlyDetected.join(', ')}`);
  }
  if (unexpectedFailures.length > 0) {
    console.log(`  ⚠ Unexpected failures:  ${unexpectedFailures.join(', ')}`);
  }
  if (missedFailures.length > 0) {
    console.log(`  ❌ Missed failures:     ${missedFailures.join(', ')}`);
  }
  if (
    correctlyDetected.length === 0 &&
    unexpectedFailures.length === 0 &&
    missedFailures.length === 0
  ) {
    console.log('  ✅ No failures expected, none detected.');
  }
  console.log('');

  if (failures.length > 0) {
    console.log('── Failure Details ────────────────────────────────────');
    for (const failure of failures) {
      console.log(`  [${failure.severity.toUpperCase()}] ${failure.code}`);
      console.log(`    ${failure.description}`);
    }
    console.log('');
  }

  // Exit code: 0 if all expected failures detected and no unexpected ones
  if (missedFailures.length > 0 || unexpectedFailures.length > 0) {
    console.log('  Result: FAIL ❌');
  } else {
    console.log('  Result: PASS ✅');
  }
  console.log('');
}
