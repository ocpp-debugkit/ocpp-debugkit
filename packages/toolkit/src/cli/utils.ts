/**
 * Shared utilities for CLI commands.
 */

import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { MAX_INPUT_SIZE_BYTES } from '../core/index.js';

/** Maximum file size for trace input (10 MB). */
const MAX_FILE_SIZE = MAX_INPUT_SIZE_BYTES;

/** Error thrown when a file is invalid or unreadable. */
export class CliError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CliError';
  }
}

/**
 * Read a trace file safely with path validation and size limits.
 * @throws {CliError} if the file is missing, too large, or unreadable.
 */
export function readTraceFile(filePath: string): string {
  // Resolve and validate the path (prevent path traversal in edge cases)
  const resolved = resolve(filePath);

  let stats;
  try {
    stats = statSync(resolved);
  } catch {
    throw new CliError(`File not found: ${filePath}`);
  }

  if (!stats.isFile()) {
    throw new CliError(`Not a file: ${filePath}`);
  }

  if (stats.size > MAX_FILE_SIZE) {
    throw new CliError(
      `File size (${stats.size} bytes) exceeds the maximum allowed size (${MAX_FILE_SIZE} bytes).`,
    );
  }

  try {
    return readFileSync(resolved, 'utf8');
  } catch {
    throw new CliError(`Failed to read file: ${filePath}`);
  }
}
