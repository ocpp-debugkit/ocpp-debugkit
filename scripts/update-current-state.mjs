#!/usr/bin/env node
// Keep CURRENT_STATE.md current from the release workflow.
//
// Run right after `changeset version`, inside the changesets "version" step, so
// the edit rides the existing "version packages" PR (which gets CI and a human
// merge) rather than pushing directly to a protected main.
//
// It maintains two machine-owned spots in CURRENT_STATE.md and nothing else:
//   1. the @ocpp-debugkit/toolkit row in the Package Status Table, and
//   2. an auto-managed release log delimited by RELEASE-LOG markers.
// Editorial prose stays hand-written.
//
// The script is idempotent: a second run for the same version is a no-op.
// It uses only Node built-ins, so it adds no dependency.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkgPath = join(repoRoot, 'packages/toolkit/package.json');
const changelogPath = join(repoRoot, 'packages/toolkit/CHANGELOG.md');
const statePath = join(repoRoot, 'CURRENT_STATE.md');

const LOG_START = '<!-- RELEASE-LOG:START -->';
const LOG_END = '<!-- RELEASE-LOG:END -->';
const TABLE_ROW = /(\| `@ocpp-debugkit\/toolkit` \| published \| )([^|]+?)( \|)/;

/** The release date, injectable for tests; otherwise today in UTC. */
function releaseDate() {
  const injected = process.env.RELEASE_DATE;
  if (injected) return injected;
  return new Date().toISOString().slice(0, 10);
}

/** Pull the change descriptions for `version` out of the toolkit CHANGELOG. */
export function changelogSummary(changelog, version) {
  const lines = changelog.split('\n');
  const start = lines.findIndex((l) => l.trim() === `## ${version}`);
  if (start === -1) return null;

  const descriptions = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) break; // next version section
    // Changeset bullets look like "- <sha>: <text>" or "- <text>".
    const bullet = lines[i].match(/^- (?:[0-9a-f]{7,40}: )?(.+)$/);
    if (bullet) descriptions.push(bullet[1].trim());
  }
  return descriptions.length ? descriptions.join('; ') : null;
}

/** Insert (or leave alone, if already present) the release-log entry. */
export function withReleaseLogEntry(state, version, entry) {
  const startIdx = state.indexOf(LOG_START);
  const endIdx = state.indexOf(LOG_END);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    throw new Error('CURRENT_STATE.md is missing the RELEASE-LOG markers');
  }
  // Idempotent: a line already naming this exact version stays as-is.
  const block = state.slice(startIdx, endIdx);
  if (block.includes(`\`${version}\``)) return state;

  const insertAt = startIdx + LOG_START.length;
  return state.slice(0, insertAt) + '\n' + entry + state.slice(insertAt);
}

/** Set the toolkit version in the Package Status Table row. */
export function withTableVersion(state, version) {
  if (!TABLE_ROW.test(state)) {
    throw new Error('CURRENT_STATE.md is missing the @ocpp-debugkit/toolkit table row');
  }
  return state.replace(TABLE_ROW, `$1${version}$3`);
}

/** Apply both edits to a CURRENT_STATE.md string. Pure, for testing. */
export function updateState(state, { version, summary, date }) {
  const next = withTableVersion(state, version);
  const entry = `- \`${version}\` (${date}): ${summary}`;
  return withReleaseLogEntry(next, version, entry);
}

function main() {
  const version = JSON.parse(readFileSync(pkgPath, 'utf8')).version;
  if (!version) throw new Error('could not read the toolkit version');

  const changelog = readFileSync(changelogPath, 'utf8');
  const summary = changelogSummary(changelog, version) ?? 'release';

  const state = readFileSync(statePath, 'utf8');
  const next = updateState(state, { version, summary, date: releaseDate() });

  writeFileSync(statePath, next);
  process.stdout.write(`CURRENT_STATE.md updated for ${version}\n`);
}

// Run only when invoked directly, so tests can import the pure helpers.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
