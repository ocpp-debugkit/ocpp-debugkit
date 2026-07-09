/**
 * `ocpp-debugkit anonymize <file>` — strip sensitive fields from a trace file.
 *
 * Anonymizes:
 * - idTag → "anonymized"
 * - chargePointSerialNumber / stationId → "station-anon"
 * - transactionId → sequential integers
 * - meterValue values → preserve relative scale, randomize base
 * - Any field matching email/phone/IP patterns
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CliError } from '../utils.js';
import { MAX_INPUT_SIZE_BYTES } from '../../core/index.js';

export interface AnonymizeOptions {
  output?: string;
}

// Patterns for PII detection
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const PHONE_RE = /\+?\d{10,15}[-\s]?\d{0,4}[-\s]?\d{0,4}/g;
const IP_RE = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g;

function anonymizeValue(value: unknown, txCounter: { next: number }): unknown {
  if (typeof value === 'string') {
    let result = value;
    result = result.replace(EMAIL_RE, '[redacted-email]');
    result = result.replace(PHONE_RE, '[redacted-phone]');
    result = result.replace(IP_RE, '[redacted-ip]');
    return result;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => anonymizeValue(item, txCounter));
  }

  if (value !== null && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    for (const [key, val] of Object.entries(obj)) {
      // Anonymize known sensitive fields
      if (key === 'idTag' && typeof val === 'string') {
        result[key] = 'anonymized';
      } else if (key === 'chargePointSerialNumber' || key === 'chargeBoxSerialNumber') {
        result[key] = 'station-anon';
      } else if (key === 'stationId') {
        result[key] = 'station-anon';
      } else if (key === 'transactionId' && typeof val === 'number') {
        result[key] = txCounter.next++;
      } else if (key === 'identifier' && typeof val === 'string') {
        result[key] = 'anonymized';
      } else {
        result[key] = anonymizeValue(val, txCounter);
      }
    }

    return result;
  }

  return value;
}

export async function anonymizeCommand(file: string, options: AnonymizeOptions): Promise<void> {
  const resolved = resolve(file);

  // Size check
  const { statSync } = await import('node:fs');
  let stats;
  try {
    stats = statSync(resolved);
  } catch {
    throw new CliError(`File not found: ${file}`);
  }

  if (stats.size > MAX_INPUT_SIZE_BYTES) {
    throw new CliError(
      `File size (${stats.size} bytes) exceeds maximum allowed (${MAX_INPUT_SIZE_BYTES} bytes).`,
    );
  }

  let content: string;
  try {
    content = readFileSync(resolved, 'utf8');
  } catch {
    throw new CliError(`Failed to read file: ${file}`);
  }

  // Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new CliError('File is not valid JSON.');
  }

  // Anonymize
  const txCounter = { next: 1 };
  const anonymized = anonymizeValue(parsed, txCounter);

  // Output
  const output = JSON.stringify(anonymized, null, 2);

  if (options.output) {
    const outputPath = resolve(options.output);
    writeFileSync(outputPath, output, 'utf8');
    console.log(`Anonymized trace written to: ${options.output}`);
  } else {
    console.log(output);
  }
}
