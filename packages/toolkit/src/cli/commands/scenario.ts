/**
 * `ocpp-debugkit scenario list` and `ocpp-debugkit scenario run <name>` commands.
 *
 * `scenario run` runs built-in or external static fixtures through the local
 * analysis engine. It is NOT active endpoint testing, WebSocket simulation,
 * live station/CSMS testing, or an active scenario runner.
 */

import { parseTrace, buildSessionTimeline, detectFailures, ParseError } from '../../core/index.js';
import type { Scenario } from '../../core/index.js';
import { scenarioNames, getScenario } from '../../scenarios/index.js';
import { CliError, readTraceFile } from '../utils.js';

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
  console.log('         ocpp-debugkit scenario run --file <path>');
  console.log('');
}

export async function scenarioRunCommand(name: string): Promise<void> {
  const scenario = getScenario(name);

  if (!scenario) {
    throw new CliError(
      `Scenario "${name}" not found. Run "ocpp-debugkit scenario list" to see available scenarios.`,
    );
  }

  await runScenarioInternal(scenario);
}

/**
 * `ocpp-debugkit scenario run --file <path>` — run an external scenario file
 * through the analysis engine.
 *
 * The external file must be a JSON object with: name, description, trace, and
 * expectedFailures fields (same shape as built-in scenarios).
 */
export async function scenarioRunFileCommand(filePath: string): Promise<void> {
  const content = readTraceFile(filePath);

  let scenario: Scenario;
  try {
    const parsed = JSON.parse(content) as unknown;
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('trace' in parsed) ||
      !('name' in parsed)
    ) {
      throw new CliError('Invalid scenario file: must contain "name" and "trace" fields.');
    }
    scenario = parsed as Scenario;
  } catch (e) {
    if (e instanceof CliError) throw e;
    throw new CliError('Invalid JSON in scenario file.');
  }

  if (!scenario.expectedFailures) {
    scenario.expectedFailures = [];
  }

  await runScenarioInternal(scenario);
}

// ---------------------------------------------------------------------------
// Shared scenario run logic
// ---------------------------------------------------------------------------

async function runScenarioInternal(scenario: Scenario): Promise<void> {
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
  const expectedCodes = new Set<string>(scenario.expectedFailures as string[]);

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
