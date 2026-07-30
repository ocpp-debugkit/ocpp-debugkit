import { describe, it, expect } from 'vitest';
import {
  changelogSummary,
  withReleaseLogEntry,
  withTableVersion,
  updateState,
} from './update-current-state.mjs';

const CHANGELOG = `# @ocpp-debugkit/toolkit

## 0.4.5

### Patch Changes

- abc1234: feat(scenarios): add meter-value-zero scenario
- def5678: fix(core): tidy a thing

## 0.4.4

### Patch Changes

- 8fe2185: feat(scenarios): add firmware-update-failure scenario
`;

const STATE = `# CURRENT_STATE.md

## Release Log

<!-- RELEASE-LOG:START -->
- \`0.4.4\` (2026-07-30): feat(scenarios): add firmware-update-failure scenario
<!-- RELEASE-LOG:END -->

## Package Status Table

| Package | Status | Version |
|---------|--------|---------|
| \`@ocpp-debugkit/toolkit\` | published | 0.4.4 |
| \`@ocpp-debugkit/core\` | deprecated | 0.1.1 |
`;

describe('changelogSummary', () => {
  it('joins multiple change descriptions and strips the commit sha', () => {
    expect(changelogSummary(CHANGELOG, '0.4.5')).toBe(
      'feat(scenarios): add meter-value-zero scenario; fix(core): tidy a thing',
    );
  });

  it('reads a single-change section', () => {
    expect(changelogSummary(CHANGELOG, '0.4.4')).toBe(
      'feat(scenarios): add firmware-update-failure scenario',
    );
  });

  it('returns null for a version not in the changelog', () => {
    expect(changelogSummary(CHANGELOG, '9.9.9')).toBeNull();
  });
});

describe('withTableVersion', () => {
  it('updates only the toolkit row', () => {
    const out = withTableVersion(STATE, '0.4.5');
    expect(out).toContain('| `@ocpp-debugkit/toolkit` | published | 0.4.5 |');
    expect(out).toContain('| `@ocpp-debugkit/core` | deprecated | 0.1.1 |');
  });

  it('throws when the row is missing', () => {
    expect(() => withTableVersion('no table here', '0.4.5')).toThrow(/table row/);
  });
});

describe('withReleaseLogEntry', () => {
  it('inserts the newest entry at the top of the block', () => {
    const entry = '- `0.4.5` (2026-08-01): feat: something';
    const out = withReleaseLogEntry(STATE, '0.4.5', entry);
    const start = out.indexOf('<!-- RELEASE-LOG:START -->');
    const newIdx = out.indexOf('0.4.5');
    const oldIdx = out.indexOf('0.4.4', start);
    expect(newIdx).toBeGreaterThan(start);
    expect(newIdx).toBeLessThan(oldIdx);
  });

  it('is idempotent for a version already present', () => {
    const entry = '- `0.4.4` (2026-07-30): duplicate';
    expect(withReleaseLogEntry(STATE, '0.4.4', entry)).toBe(STATE);
  });

  it('throws when the markers are missing', () => {
    expect(() => withReleaseLogEntry('no markers', '0.4.5', 'x')).toThrow(/markers/);
  });
});

describe('updateState', () => {
  it('applies both edits and is idempotent on a second run', () => {
    const once = updateState(STATE, {
      version: '0.4.5',
      summary: 'feat: something',
      date: '2026-08-01',
    });
    expect(once).toContain('| `@ocpp-debugkit/toolkit` | published | 0.4.5 |');
    expect(once).toContain('- `0.4.5` (2026-08-01): feat: something');

    const twice = updateState(once, {
      version: '0.4.5',
      summary: 'feat: something',
      date: '2026-08-01',
    });
    expect(twice).toBe(once);
  });
});
