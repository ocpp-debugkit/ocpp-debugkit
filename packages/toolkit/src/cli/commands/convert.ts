/**
 * `ocpp-debugkit convert <file>` - convert a trace file to the Open OCPP
 * Trace v1.1 interchange format (JSONL).
 *
 * Accepts any input format `parseTrace()` understands, including the Open
 * OCPP Trace format itself. When the input is a JSON Object trace, its
 * `metadata.ocppVersion` and `metadata.stationId` are carried onto every
 * exported record; other input formats have no trace-level metadata to carry.
 *
 * Converted JSONL goes to stdout (or `--output`); warnings for events the
 * format cannot represent go to stderr, so piped output stays clean.
 */

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  parseTrace,
  toOpenOcppTraceJsonl,
  ParseError,
  type OpenOcppTraceExportOptions,
} from '../../core/index.js';
import { CliError, readTraceFile } from '../utils.js';

export interface ConvertOptions {
  output?: string;
}

/** Best-effort trace-level metadata from a JSON Object input. */
function extractExportOptions(content: string): OpenOcppTraceExportOptions {
  try {
    const parsed: unknown = JSON.parse(content);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const metadata = (parsed as Record<string, unknown>).metadata;
    if (metadata === null || typeof metadata !== 'object' || Array.isArray(metadata)) return {};
    const { ocppVersion, stationId } = metadata as Record<string, unknown>;
    return {
      ...(typeof ocppVersion === 'string' && { ocppVersion }),
      ...(typeof stationId === 'string' && { chargePointId: stationId }),
    };
  } catch {
    return {}; // JSONL input; no trace-level metadata wrapper.
  }
}

export async function convertCommand(file: string, options: ConvertOptions): Promise<void> {
  const content = readTraceFile(file);

  let result;
  try {
    result = parseTrace(content);
  } catch (e) {
    if (e instanceof ParseError || e instanceof Error) {
      throw new CliError(e.message);
    }
    throw new CliError('Unknown error during parsing');
  }

  const { jsonl, warnings } = toOpenOcppTraceJsonl(result.events, extractExportOptions(content));

  for (const warning of [...result.warnings, ...warnings]) {
    console.error(`warning: ${warning.message}`);
  }

  if (jsonl === '') {
    throw new CliError(
      'No events could be converted: the Open OCPP Trace format requires a timestamp and a known direction on every record.',
    );
  }

  if (options.output) {
    writeFileSync(resolve(options.output), jsonl, 'utf8');
    console.log(`Open OCPP Trace written to: ${options.output}`);
  } else {
    process.stdout.write(jsonl);
  }
}
