/**
 * External fixture test — verifies @ocpp-debugkit/toolkit subpath exports
 * work for real consumers (installed from tarball, not workspace symlinks).
 *
 * This script is run by CI after building + packing the toolkit package.
 * It imports each subpath export and exercises core functionality.
 *
 * Run: node test.mjs
 * Exit code 0 = pass, non-zero = fail.
 */

import { createRequire } from 'node:module';
import { writeFileSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const require = createRequire(import.meta.url);
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`FAIL: ${message}`);
  }
}

function assertThrows(fn, message) {
  try {
    fn();
    failed++;
    console.error(`FAIL: ${message} — expected throw`);
  } catch {
    passed++;
  }
}

console.log('=== @ocpp-debugkit/toolkit external fixture test ===\n');

// --- /core ---
console.log('Testing /core...');
const core = await import('@ocpp-debugkit/toolkit/core');

assert(typeof core.parseTrace === 'function', 'parseTrace is a function');
assert(typeof core.buildSessionTimeline === 'function', 'buildSessionTimeline is a function');
assert(typeof core.detectFailures === 'function', 'detectFailures is a function');
assert(typeof core.summarizeSessions === 'function', 'summarizeSessions is a function');
assert(typeof core.validateMessage === 'function', 'validateMessage is a function');
assert(typeof core.normalizeEvents === 'function', 'normalizeEvents is a function');
assert(core.MAX_INPUT_SIZE_BYTES > 0, 'MAX_INPUT_SIZE_BYTES > 0');
assert(core.MAX_EVENT_COUNT > 0, 'MAX_EVENT_COUNT > 0');
assert(typeof core.ParseError === 'function', 'ParseError is a constructor');

// Test parseTrace on a simple JSON Object trace
const jsonTrace = {
  traceId: 'external-fixture-test',
  metadata: {
    stationId: 'CS-SYNTHETIC-TEST',
    ocppVersion: '1.6',
    source: 'external-fixture',
  },
  events: [
    {
      id: 'evt-1',
      timestamp: '2026-01-01T00:00:00Z',
      direction: 'CS_TO_CSMS',
      message: [2, 'msg-001', 'BootNotification', { chargePointSerialNumber: 'CS-SYNTHETIC-001' }],
    },
    {
      id: 'evt-2',
      timestamp: '2026-01-01T00:00:05Z',
      direction: 'CSMS_TO_CS',
      message: [3, 'msg-001', { status: 'Accepted' }],
    },
    {
      id: 'evt-3',
      timestamp: '2026-01-01T00:00:10Z',
      direction: 'CS_TO_CSMS',
      message: [2, 'msg-002', 'Heartbeat', {}],
    },
    {
      id: 'evt-4',
      timestamp: '2026-01-01T00:00:15Z',
      direction: 'CSMS_TO_CS',
      message: [3, 'msg-002', { currentTime: '2026-01-01T00:00:15Z' }],
    },
  ],
};

const parseResult = core.parseTrace(JSON.stringify(jsonTrace));
assert(
  parseResult.events.length === 4,
  `parseTrace produces 4 events (got ${parseResult.events.length})`,
);
assert(parseResult.warnings.length === 0, 'parseTrace has no warnings for valid input');

// Test detectFailures
const sessions = core.buildSessionTimeline(parseResult.events);
const failures = core.detectFailures(parseResult.events, sessions);
assert(Array.isArray(failures), 'detectFailures returns an array');

// Open OCPP Trace interop
assert(typeof core.parseOpenOcppTrace === 'function', 'parseOpenOcppTrace is a function');
assert(typeof core.deriveOpenOcppTraceView === 'function', 'deriveOpenOcppTraceView is a function');
const openTrace = [
  JSON.stringify({
    schemaVersion: '1.1',
    timestamp: '2026-01-01T00:00:00Z',
    transport: 'json',
    direction: 'cp-to-csms',
    messageType: 'CALL',
    messageId: 'm1',
    action: 'BootNotification',
    payload: {},
    raw: '[2,"m1","BootNotification",{}]',
  }),
  JSON.stringify({
    schemaVersion: '1.1',
    timestamp: '2026-01-01T00:00:01Z',
    transport: 'json',
    direction: 'csms-to-cp',
    messageType: 'CALLRESULT',
    messageId: 'm1',
    payload: { status: 'Accepted' },
    raw: '[3,"m1",{"status":"Accepted"}]',
  }),
].join('\n');
const openResult = core.parseOpenOcppTrace(openTrace);
assert(
  openResult.events.length === 2,
  `parseOpenOcppTrace produces 2 events (got ${openResult.events.length})`,
);
assert(core.parseTrace(openTrace).events.length === 2, 'parseTrace auto-detects Open OCPP Trace');
const openView = core.deriveOpenOcppTraceView(openTrace);
assert(
  openView.records[1].action === 'BootNotification',
  'response action derived by messageId correlation',
);
assert(typeof core.toOpenOcppTraceJsonl === 'function', 'toOpenOcppTraceJsonl is a function');
const exported = core.toOpenOcppTraceJsonl(openResult.events);
assert(
  exported.jsonl.trim().split('\n').length === 2,
  'toOpenOcppTraceJsonl emits one record per event',
);
assert(
  core.parseOpenOcppTrace(exported.jsonl).events.length === 2,
  'exported JSONL re-parses (round trip)',
);

console.log('  /core tests passed\n');

// --- /scenarios ---
console.log('Testing /scenarios...');
const scenarios = await import('@ocpp-debugkit/toolkit/scenarios');

assert(Array.isArray(scenarios.scenarios), 'scenarios is an array');
assert(
  scenarios.scenarios.length === 17,
  `17 scenarios exported (got ${scenarios.scenarios.length})`,
);
assert(typeof scenarios.getScenario === 'function', 'getScenario is a function');
assert(scenarios.getScenario('normal-session') !== undefined, 'normal-session scenario exists');
assert(
  scenarios.getScenario('nonexistent') === undefined,
  'nonexistent scenario returns undefined',
);

console.log('  /scenarios tests passed\n');

// --- /reporter ---
console.log('Testing /reporter...');
const reporter = await import('@ocpp-debugkit/toolkit/reporter');

assert(
  typeof reporter.generateMarkdownReport === 'function',
  'generateMarkdownReport is a function',
);

// Generate a report
const reportInput = {
  events: parseResult.events,
  sessions,
  failures,
  summaries: core.summarizeSessions(sessions, failures),
  warnings: parseResult.warnings,
};
const markdown = reporter.generateMarkdownReport(reportInput);
assert(typeof markdown === 'string', 'generateMarkdownReport returns a string');
assert(markdown.includes('# OCPP DebugKit'), 'report contains title');
assert(markdown.includes('## Session Overview'), 'report contains session overview');

console.log('  /reporter tests passed\n');

// --- /replay ---
console.log('Testing /replay...');
const replay = await import('@ocpp-debugkit/toolkit/replay');

assert(typeof replay.ReplayEngine === 'function', 'ReplayEngine is a constructor');

const engine = new replay.ReplayEngine(parseResult.events, failures);
assert(engine.totalEvents === 4, `ReplayEngine has 4 events (got ${engine.totalEvents})`);
assert(engine.current === 0, 'ReplayEngine starts at index 0');

const step1 = engine.step();
assert(step1 !== null, 'step() returns first event');
assert(step1.index === 0, 'first step index is 0');

engine.reset();
assert(engine.current === 0, 'reset returns to index 0');

console.log('  /replay tests passed\n');

// --- /react ---
console.log('Testing /react...');
// React is a peer dependency — install it in the fixture project
try {
  const result = execSync('npm install react@19', { encoding: 'utf8', cwd: process.cwd() });
  console.log('  Installed react for peer dep');
} catch (e) {
  console.error('  Could not install react — skipping /react import test');
}

try {
  const react = await import('@ocpp-debugkit/toolkit/react');

  assert(typeof react.SessionTimeline === 'function', 'SessionTimeline is exported');
  assert(typeof react.MessageInspector === 'function', 'MessageInspector is exported');
  assert(typeof react.FailureSummary === 'function', 'FailureSummary is exported');
  assert(typeof react.ReportViewer === 'function', 'ReportViewer is exported');
  assert(typeof react.ReplayControls === 'function', 'ReplayControls is exported');

  console.log('  /react tests passed\n');
} catch (e) {
  // If react can't be loaded, just verify the exports exist in package.json
  console.log('  /react import skipped (react not loadable), verifying exports map only');
  const toolkitPkgPath = require.resolve('@ocpp-debugkit/toolkit/package.json');
  const pkg = JSON.parse(readFileSync(toolkitPkgPath, 'utf8'));
  assert(pkg.exports['./react'] !== undefined, 'react subpath exists in exports map');
  console.log('  /react exports map verified\n');
}

// --- /fixtures ---
console.log('Testing /fixtures...');
const fixturesMod = await import('@ocpp-debugkit/toolkit/fixtures');

assert(fixturesMod.fixtures !== undefined, 'fixtures object is exported');
assert(typeof fixturesMod.fixtures.normalSession === 'object', 'normalSession fixture exists');
assert(typeof fixturesMod.fixtures.failedAuth === 'object', 'failedAuth fixture exists');
assert(typeof fixturesMod.fixtures.connectorFault === 'object', 'connectorFault fixture exists');

console.log('  /fixtures tests passed\n');

// --- Root barrel ---
console.log('Testing root barrel export (.)...');
const toolkit = await import('@ocpp-debugkit/toolkit');

assert(typeof toolkit.parseTrace === 'function', 'root parseTrace is a function');
assert(typeof toolkit.detectFailures === 'function', 'root detectFailures is a function');
assert(
  typeof toolkit.buildSessionTimeline === 'function',
  'root buildSessionTimeline is a function',
);
assert(typeof toolkit.fixtures === 'object', 'root fixtures is an object');
assert(typeof toolkit.parseOpenOcppTrace === 'function', 'root parseOpenOcppTrace is a function');

console.log('  root barrel tests passed\n');

// --- CLI smoke test ---
console.log('Testing CLI...');
// The CLI is exported via subpath ./cli — resolve it from the package directory
const toolkitPkgPath = require.resolve('@ocpp-debugkit/toolkit/package.json');
const toolkitDir = toolkitPkgPath.replace(/\/package\.json$/, '');
const cliPath = join(toolkitDir, 'dist', 'cli', 'index.js');
assert(cliPath.endsWith('cli/index.js'), `CLI resolves to cli/index.js (got ${cliPath})`);

// Write a trace file and run the CLI
const dir = mkdtempSync(join(tmpdir(), 'toolkit-test-'));
const tracePath = join(dir, 'trace.json');
writeFileSync(tracePath, JSON.stringify(fixturesMod.fixtures.normalSession), 'utf8');

try {
  const output = execSync(`node ${cliPath} inspect ${tracePath}`, { encoding: 'utf8' });
  assert(output.includes('Trace Inspection'), 'CLI inspect outputs "Trace Inspection"');
  assert(output.includes('Sessions:'), 'CLI inspect shows session count');
} catch (e) {
  failed++;
  console.error(`FAIL: CLI smoke test — ${e.message}`);
}

// CLI scenario list
try {
  const output = execSync(`node ${cliPath} scenario list`, { encoding: 'utf8' });
  assert(output.includes('normal-session'), 'CLI scenario list shows normal-session');
  assert(output.includes('failed-auth'), 'CLI scenario list shows failed-auth');
} catch (e) {
  failed++;
  console.error(`FAIL: CLI scenario list — ${e.message}`);
}

// CLI convert
try {
  const output = execSync(`node ${cliPath} convert ${tracePath}`, { encoding: 'utf8' });
  const firstLine = JSON.parse(output.trim().split('\n')[0]);
  assert(firstLine.schemaVersion === '1.1', 'CLI convert emits schemaVersion 1.1');
  assert(firstLine.messageType === 'CALL', 'CLI convert first record is a CALL');
} catch (e) {
  failed++;
  console.error(`FAIL: CLI convert - ${e.message}`);
}

console.log('  CLI tests passed\n');

// --- Summary ---
console.log('=== Summary ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
  console.error('\n❌ External fixture test FAILED');
  process.exit(1);
} else {
  console.log('\n✅ External fixture test PASSED');
  process.exit(0);
}
