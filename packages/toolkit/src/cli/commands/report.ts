/**
 * `ocpp-debugkit report <file>` — generate a report from an OCPP trace file.
 */

import {
  parseTrace,
  buildSessionTimeline,
  detectFailures,
  summarizeSessions,
  ParseError,
  type Trace,
} from '../../core/index.js';
import { generateMarkdownReport } from '../../reporter/index.js';
import { CliError, readTraceFile } from '../utils.js';

export interface ReportOptions {
  format: string;
  output?: string;
}

export async function reportCommand(file: string, options: ReportOptions): Promise<void> {
  const content = readTraceFile(file);

  // Parse the trace to get events
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

  // Also extract metadata from the original JSON (if JSON Object format)
  let metadata:
    | {
        traceId?: string;
        stationId?: string;
        ocppVersion?: string;
        source?: string;
        description?: string;
      }
    | undefined;
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === 'object' && 'metadata' in parsed) {
      metadata = (parsed as Trace).metadata;
    }
  } catch {
    // JSONL or bare array — no metadata
  }

  const sessions = buildSessionTimeline(result.events);
  const failures = detectFailures(result.events, sessions);
  const summaries = summarizeSessions(sessions, failures);

  const report = generateMarkdownReport({
    events: result.events,
    sessions,
    failures,
    summaries,
    warnings: result.warnings,
    metadata,
  });

  if (options.output) {
    const { writeFileSync } = await import('node:fs');
    writeFileSync(options.output, report, 'utf8');
    console.log(`Report written to ${options.output}`);
  } else {
    console.log(report);
  }
}
