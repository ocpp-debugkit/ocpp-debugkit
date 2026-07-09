import {
  parseTrace,
  buildSessionTimeline,
  detectFailures,
  summarizeSessions,
} from '@ocpp-debugkit/toolkit/core';
import { generateMarkdownReport } from '@ocpp-debugkit/toolkit/reporter';
import { readFileSync } from 'node:fs';

// Parse the trace
const content = readFileSync('./sample-trace.json', 'utf8');
const { events, warnings } = parseTrace(content);

console.log(`Parsed ${events.length} events (${warnings.length} warnings)`);

// Build session timeline
const sessions = buildSessionTimeline(events);
console.log(`Found ${sessions.length} session(s)`);

// Detect failures
const failures = detectFailures(events, sessions);
console.log(`Detected ${failures.length} failure(s)`);
for (const f of failures) {
  console.log(`  [${f.severity}] ${f.code}: ${f.description}`);
}

// Generate summary
const summaries = summarizeSessions(sessions, failures);
for (const s of summaries) {
  console.log(
    `  Session ${s.sessionId}: ${s.status}, ${s.eventCount} events, ${s.failureCount} failures`,
  );
}

// Generate Markdown report
const report = generateMarkdownReport({ events, sessions, failures, summaries, warnings });
console.log('\n--- Markdown Report (first 500 chars) ---');
console.log(report.slice(0, 500));
