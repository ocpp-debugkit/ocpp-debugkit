import { describe, it, expect } from 'vitest';
import { execa } from 'execa';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fixtures } from '../core/index.js';

const CLI_PATH = join(process.cwd(), 'packages/toolkit/dist/cli/index.js');

// Helper: run the CLI with given args
async function runCli(
  ...args: string[]
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  try {
    const result = await execa('node', [CLI_PATH, ...args]);
    return { stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode ?? 0 };
  } catch (e) {
    const error = e as { stdout?: string; stderr?: string; exitCode?: number };
    return {
      stdout: error.stdout ?? '',
      stderr: error.stderr ?? '',
      exitCode: error.exitCode ?? 1,
    };
  }
}

// Helper: write a trace to a temp file
function writeTempTrace(trace: unknown): string {
  const dir = mkdtempSync(join(tmpdir(), 'ocpp-test-'));
  const filePath = join(dir, 'trace.json');
  writeFileSync(filePath, JSON.stringify(trace), 'utf8');
  return filePath;
}

describe('CLI integration', () => {
  describe('--version', () => {
    it('outputs version', async () => {
      const result = await runCli('--version');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('0.0.0');
    });
  });

  describe('--help', () => {
    it('shows help with all commands', async () => {
      const result = await runCli('--help');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('inspect');
      expect(result.stdout).toContain('report');
      expect(result.stdout).toContain('scenario');
    });
  });

  describe('inspect', () => {
    it('inspects a normal session trace', async () => {
      const filePath = writeTempTrace(fixtures.normalSession);
      const result = await runCli('inspect', filePath);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Trace Inspection');
      expect(result.stdout).toContain('Sessions:  1');
      expect(result.stdout).toContain('No failures detected');
    });

    it('inspects a failed-auth trace and shows failures', async () => {
      const filePath = writeTempTrace(fixtures.failedAuth);
      const result = await runCli('inspect', filePath);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('FAILED_AUTHORIZATION');
    });

    it('inspects a connector-fault trace and shows failures', async () => {
      const filePath = writeTempTrace(fixtures.connectorFault);
      const result = await runCli('inspect', filePath);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('CONNECTOR_FAULT');
    });

    it('handles missing file gracefully', async () => {
      const result = await runCli('inspect', '/nonexistent/file.json');
      expect(result.exitCode).not.toBe(0);
    });

    it('handles invalid JSON gracefully', async () => {
      const dir = mkdtempSync(join(tmpdir(), 'ocpp-test-'));
      const filePath = join(dir, 'bad.json');
      writeFileSync(filePath, '{ invalid json }', 'utf8');
      const result = await runCli('inspect', filePath);
      expect(result.exitCode).not.toBe(0);
    });
  });

  describe('report', () => {
    it('generates a Markdown report to stdout', async () => {
      const filePath = writeTempTrace(fixtures.normalSession);
      const result = await runCli('report', filePath);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('OCPP DebugKit — Trace Analysis Report');
      expect(result.stdout).toContain('## Session Overview');
      expect(result.stdout).toContain('## Failures');
    });

    it('generates a report with failures', async () => {
      const filePath = writeTempTrace(fixtures.failedAuth);
      const result = await runCli('report', filePath);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('FAILED_AUTHORIZATION');
      expect(result.stdout).toContain('## Suggested Next Steps');
    });

    it('writes report to a file with --output', async () => {
      const filePath = writeTempTrace(fixtures.normalSession);
      const dir = mkdtempSync(join(tmpdir(), 'ocpp-test-'));
      const outputPath = join(dir, 'report.md');
      const result = await runCli('report', filePath, '--output', outputPath);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Report written to');
    });
  });

  describe('scenario list', () => {
    it('lists all available scenarios', async () => {
      const result = await runCli('scenario', 'list');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('normal-session');
      expect(result.stdout).toContain('failed-auth');
      expect(result.stdout).toContain('connector-fault');
      expect(result.stdout).toContain('station-offline');
      expect(result.stdout).toContain('unexpected-stop-reason');
    });
  });

  describe('scenario run', () => {
    it('runs normal-session scenario and passes', async () => {
      const result = await runCli('scenario', 'run', 'normal-session');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Running Scenario: normal-session');
      expect(result.stdout).toContain('No failures expected, none detected');
      expect(result.stdout).toContain('PASS');
    });

    it('runs failed-auth scenario and detects FAILED_AUTHORIZATION', async () => {
      const result = await runCli('scenario', 'run', 'failed-auth');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('FAILED_AUTHORIZATION');
      expect(result.stdout).toContain('PASS');
    });

    it('runs connector-fault scenario and detects CONNECTOR_FAULT', async () => {
      const result = await runCli('scenario', 'run', 'connector-fault');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('CONNECTOR_FAULT');
      expect(result.stdout).toContain('PASS');
    });

    it('runs station-offline scenario and detects STATION_OFFLINE_DURING_SESSION', async () => {
      const result = await runCli('scenario', 'run', 'station-offline');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('STATION_OFFLINE_DURING_SESSION');
      expect(result.stdout).toContain('PASS');
    });

    it('runs unexpected-stop-reason scenario (no failures)', async () => {
      const result = await runCli('scenario', 'run', 'unexpected-stop-reason');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('No failures expected, none detected');
      expect(result.stdout).toContain('PASS');
    });

    it('handles unknown scenario name', async () => {
      const result = await runCli('scenario', 'run', 'nonexistent');
      expect(result.exitCode).not.toBe(0);
    });
  });

  describe('ci', () => {
    it('runs all scenarios and exits 0 when all pass', async () => {
      const result = await runCli('ci');
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('CI Mode');
      expect(result.stdout).toContain('PASS');
    });

    it('supports --format json', async () => {
      const result = await runCli('ci', '--format', 'json');
      expect(result.exitCode).toBe(0);
      const parsed = JSON.parse(result.stdout);
      expect(parsed).toHaveProperty('results');
      expect(parsed).toHaveProperty('allPassed');
      expect(parsed.allPassed).toBe(true);
      expect(parsed.results.length).toBeGreaterThan(0);
    });
  });

  describe('anonymize', () => {
    it('anonymizes sensitive fields in a trace', async () => {
      const trace = {
        events: [
          {
            timestamp: '2024-01-15T10:00:00.000Z',
            message: [
              2,
              'msg-001',
              'BootNotification',
              {
                chargePointSerialNumber: 'REAL-SERIAL-001',
                chargePointVendor: 'VendorX',
              },
            ],
          },
          {
            timestamp: '2024-01-15T10:00:01.000Z',
            message: [2, 'msg-002', 'Authorize', { idTag: 'REAL-TAG-123' }],
          },
          {
            timestamp: '2024-01-15T10:00:02.000Z',
            message: [2, 'msg-003', 'StartTransaction', { connectorId: 1, idTag: 'REAL-TAG-123' }],
          },
          {
            timestamp: '2024-01-15T10:00:02.500Z',
            message: [3, 'msg-003', { transactionId: 99999, idTagInfo: { status: 'Accepted' } }],
          },
        ],
      };
      const filePath = writeTempTrace(trace);
      const result = await runCli('anonymize', filePath);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).not.toContain('REAL-SERIAL-001');
      expect(result.stdout).not.toContain('REAL-TAG-123');
      expect(result.stdout).toContain('anonymized');
      expect(result.stdout).toContain('station-anon');
    });

    it('writes to file with --output', async () => {
      const trace = {
        events: [
          {
            timestamp: '2024-01-15T10:00:00.000Z',
            message: [2, 'msg-001', 'BootNotification', { chargePointSerialNumber: 'SECRET' }],
          },
        ],
      };
      const filePath = writeTempTrace(trace);
      const outputPath = join(mkdtempSync(join(tmpdir(), 'ocpp-out-')), 'anon.json');
      const result = await runCli('anonymize', filePath, '--output', outputPath);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Anonymized trace written to');
    });
  });

  describe('diff', () => {
    it('shows differences between two traces', async () => {
      const traceA = {
        events: [
          {
            timestamp: '2024-01-15T10:00:00.000Z',
            message: [2, 'msg-001', 'BootNotification', { chargePointSerialNumber: 'CS-001' }],
          },
          {
            timestamp: '2024-01-15T10:00:00.500Z',
            message: [3, 'msg-001', { status: 'Accepted', interval: 60 }],
          },
        ],
      };
      const traceB = {
        events: [
          {
            timestamp: '2024-01-15T10:00:00.000Z',
            message: [2, 'msg-001', 'BootNotification', { chargePointSerialNumber: 'CS-001' }],
          },
          {
            timestamp: '2024-01-15T10:00:01.500Z',
            message: [3, 'msg-001', { status: 'Accepted', interval: 60 }],
          },
        ],
      };
      const fileA = writeTempTrace(traceA);
      const fileB = writeTempTrace(traceB);
      const result = await runCli('diff', fileA, fileB);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Trace Diff');
      expect(result.stdout).toContain('Modified events');
    });

    it('supports --format json', async () => {
      const traceA = {
        events: [
          { timestamp: '2024-01-15T10:00:00.000Z', message: [2, 'ma1', 'BootNotification', {}] },
        ],
      };
      const traceB = {
        events: [{ timestamp: '2024-01-15T10:00:00.000Z', message: [2, 'mb1', 'Heartbeat', {}] }],
      };
      const fileA = writeTempTrace(traceA);
      const fileB = writeTempTrace(traceB);
      const result = await runCli('diff', fileA, fileB, '--format', 'json');
      expect(result.exitCode).toBe(0);
      const parsed = JSON.parse(result.stdout);
      expect(parsed).toHaveProperty('onlyInA');
      expect(parsed).toHaveProperty('onlyInB');
    });
  });
});
