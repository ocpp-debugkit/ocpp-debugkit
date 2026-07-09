import {
  parseTrace,
  detectFailures,
  buildSessionTimeline,
  summarizeSessions,
} from '@ocpp-debugkit/toolkit/core';
import { generateHtmlReport } from '@ocpp-debugkit/toolkit/reporter';
import { readFileSync, writeFileSync } from 'node:fs';

// Read JSONL trace (one event per line)
const content = readFileSync('./sample-trace.jsonl', 'utf8');
const { events, warnings } = parseTrace(content);

console.log(`Parsed ${events.length} events from JSONL (${warnings.length} warnings)`);

// Detect failures
const sessions = buildSessionTimeline(events);
const failures = detectFailures(events, sessions);
console.log(`Detected ${failures.length} failure(s)`);

// Generate HTML report
const summaries = summarizeSessions(sessions, failures);
const html = generateHtmlReport({ events, sessions, failures, summaries, warnings });

writeFileSync('./report.html', html, 'utf8');
console.log('HTML report written to report.html');
