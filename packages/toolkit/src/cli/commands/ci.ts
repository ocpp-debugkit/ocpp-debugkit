/**
 * `ocpp-debugkit ci [dir]` — run all scenarios, exit 0 if all pass, 1 if any fail.
 *
 * Supports `--format json` for CI tooling and `[dir]` for external scenario files.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import type { Scenario } from '../../core/index.js';
import { evaluateScenario } from '../../core/assertions.js';
import { scenarios } from '../../scenarios/index.js';

export interface CiOptions {
  format: string;
}

interface ScenarioResult {
  name: string;
  passed: boolean;
  detectedFailures: string[];
  expectedFailures: string[];
  assertionResults: { type: string; passed: boolean; message: string }[];
}

export async function ciCommand(dir: string | undefined, options: CiOptions): Promise<void> {
  const results: ScenarioResult[] = [];

  // Run built-in scenarios
  for (const scenario of scenarios) {
    const result = evaluateScenario(scenario as Scenario);
    results.push({
      name: scenario.name,
      passed: result.allPassed,
      detectedFailures: result.detectedFailureCodes,
      expectedFailures: scenario.expectedFailures,
      assertionResults: result.assertions.map((a) => ({
        type: a.assertion.type,
        passed: a.passed,
        message: a.message,
      })),
    });
  }

  // Run external scenarios from directory
  if (dir) {
    const resolvedDir = resolve(dir);
    let files: string[];
    try {
      files = readdirSync(resolvedDir).filter((f) => f.endsWith('.json'));
    } catch {
      console.error(`Error: Cannot read directory: ${dir}`);
      process.exitCode = 1;
      return;
    }

    for (const file of files) {
      const filePath = join(resolvedDir, file);
      try {
        const content = readFileSync(filePath, 'utf8');
        const scenario = JSON.parse(content) as Scenario;
        const result = evaluateScenario(scenario);
        results.push({
          name: scenario.name || file,
          passed: result.allPassed,
          detectedFailures: result.detectedFailureCodes,
          expectedFailures: scenario.expectedFailures || [],
          assertionResults: result.assertions.map((a) => ({
            type: a.assertion.type,
            passed: a.passed,
            message: a.message,
          })),
        });
      } catch {
        console.error(`Error: Failed to parse scenario file: ${file}`);
      }
    }
  }

  const allPassed = results.every((r) => r.passed);

  if (options.format === 'json') {
    console.log(JSON.stringify({ results, allPassed }, null, 2));
  } else {
    console.log('');
    console.log('═'.repeat(60));
    console.log('  OCPP DebugKit — CI Mode');
    console.log('═'.repeat(60));
    console.log('');

    for (const result of results) {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`  ${status}  ${result.name}`);

      if (!result.passed) {
        if (
          JSON.stringify(result.detectedFailures.sort()) !==
          JSON.stringify(result.expectedFailures.sort())
        ) {
          console.log(`         Expected: ${result.expectedFailures.join(', ') || 'none'}`);
          console.log(`         Detected: ${result.detectedFailures.join(', ') || 'none'}`);
        }
        for (const assertion of result.assertionResults) {
          if (!assertion.passed) {
            console.log(`         Assertion "${assertion.type}": ${assertion.message}`);
          }
        }
      }
    }

    console.log('');
    console.log(
      `  Total: ${results.length} | Passed: ${results.filter((r) => r.passed).length} | Failed: ${results.filter((r) => !r.passed).length}`,
    );
    console.log('');
  }

  if (!allPassed) {
    process.exitCode = 1;
  }
}
