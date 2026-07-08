/**
 * `ocpp-debugkit inspect <file>` — parse and analyze an OCPP trace file.
 */

import {
  parseTrace,
  buildSessionTimeline,
  detectFailures,
  summarizeSessions,
  ParseError,
} from '../../core/index.js';
import { CliError, readTraceFile } from '../utils.js';

export interface InspectOptions {
  format: string;
}

export async function inspectCommand(file: string, _options: InspectOptions): Promise<void> {
  const content = readTraceFile(file);

  let result;
  try {
    result = parseTrace(content);
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
  const summaries = summarizeSessions(sessions, failures);

  // Output to stdout
  console.log('');
  console.log('═'.repeat(60));
  console.log('  OCPP DebugKit — Trace Inspection');
  console.log('═'.repeat(60));
  console.log('');

  console.log(`  Events:    ${result.events.length}`);
  console.log(`  Sessions:  ${sessions.length}`);
  console.log(`  Failures:  ${failures.length}`);
  console.log(`  Warnings:  ${result.warnings.length}`);
  console.log('');

  if (result.warnings.length > 0) {
    console.log('── Parse Warnings ──────────────────────────────────────');
    for (const w of result.warnings) {
      console.log(`  ⚠ ${w.message}`);
    }
    console.log('');
  }

  console.log('── Sessions ────────────────────────────────────────────');
  for (const summary of summaries) {
    const duration =
      summary.durationMs !== null ? `${(summary.durationMs / 1000).toFixed(1)}s` : 'Unknown';
    console.log(
      `  ${summary.sessionId} | station=${summary.stationId} | conn=${summary.connectorId ?? '-'} | tx=${summary.transactionId ?? '-'} | ${summary.status} | ${duration} | ${summary.eventCount} events | ${summary.failureCount} failures`,
    );
  }
  console.log('');

  if (failures.length > 0) {
    console.log('── Failures ────────────────────────────────────────────');
    for (const failure of failures) {
      console.log(`  [${failure.severity.toUpperCase()}] ${failure.code}`);
      console.log(`    ${failure.description}`);
      console.log(`    Events: ${failure.eventIds.join(', ')}`);
    }
    console.log('');
  } else {
    console.log('── Failures ────────────────────────────────────────────');
    console.log('  No failures detected. ✅');
    console.log('');
  }
}
