/**
 * `ocpp-debugkit diff <a> <b>` — compare two trace files and output differences.
 *
 * Uses `diffTraces()` from the core module.
 */

import { parseTrace, diffTraces, ParseError } from '../../core/index.js';
import { CliError, readTraceFile } from '../utils.js';

export interface DiffOptions {
  format: string;
}

export async function diffCommand(
  fileA: string,
  fileB: string,
  options: DiffOptions,
): Promise<void> {
  const contentA = readTraceFile(fileA);
  const contentB = readTraceFile(fileB);

  let resultA, resultB;
  try {
    resultA = parseTrace(contentA);
    resultB = parseTrace(contentB);
  } catch (e) {
    if (e instanceof ParseError) {
      throw new CliError(e.message);
    }
    throw new CliError('Failed to parse trace files.');
  }

  const diff = diffTraces(resultA, resultB);

  if (options.format === 'json') {
    console.log(JSON.stringify(diff, null, 2));
    return;
  }

  // Human-readable output
  console.log('');
  console.log('═'.repeat(60));
  console.log('  OCPP DebugKit — Trace Diff');
  console.log('═'.repeat(60));
  console.log('');

  console.log(`  Events only in A: ${diff.onlyInA.length}`);
  for (const event of diff.onlyInA) {
    console.log(`    ${event.action ?? 'Unknown'} (messageId: ${event.messageId})`);
  }

  console.log('');
  console.log(`  Events only in B: ${diff.onlyInB.length}`);
  for (const event of diff.onlyInB) {
    console.log(`    ${event.action ?? 'Unknown'} (messageId: ${event.messageId})`);
  }

  console.log('');
  console.log(`  Modified events: ${diff.modified.length}`);
  for (const mod of diff.modified) {
    console.log(`    [${mod.field}] messageId: ${mod.messageId}`);
    console.log(`      A: ${JSON.stringify(mod.valueA)}`);
    console.log(`      B: ${JSON.stringify(mod.valueB)}`);
  }

  console.log('');
  console.log(`  Failures only in A: ${diff.failuresOnlyInA.length}`);
  for (const f of diff.failuresOnlyInA) {
    console.log(`    [${f.severity}] ${f.code}: ${f.description}`);
  }

  console.log('');
  console.log(`  Failures only in B: ${diff.failuresOnlyInB.length}`);
  for (const f of diff.failuresOnlyInB) {
    console.log(`    [${f.severity}] ${f.code}: ${f.description}`);
  }

  console.log('');
  console.log('  Summary Differences:');
  if (diff.summaryDiff.differences.length > 0) {
    for (const d of diff.summaryDiff.differences) {
      console.log(`    ${d}`);
    }
  } else {
    console.log('    No summary differences');
  }
  console.log('');
}
