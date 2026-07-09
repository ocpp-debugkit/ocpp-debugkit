import {
  parseTrace,
  validateMessages,
  detectFailures,
  buildSessionTimeline,
} from '@ocpp-debugkit/toolkit/core';
import { readFileSync } from 'node:fs';

const content = readFileSync('./sample-trace.json', 'utf8');
const { events } = parseTrace(content);

// Validate each message
const validations = validateMessages(events);
let invalidCount = 0;
for (let i = 0; i < events.length; i++) {
  const v = validations[i];
  if (v && !v.valid) {
    invalidCount++;
    console.log(`Event ${i}: INVALID - ${v.errors.join(', ')}`);
  }
}
console.log(`\n${events.length - invalidCount}/${events.length} messages valid`);

// Detect failures
const sessions = buildSessionTimeline(events);
const failures = detectFailures(events, sessions);
console.log(`\nDetected ${failures.length} failure(s):`);
for (const f of failures) {
  console.log(`  [${f.severity.toUpperCase()}] ${f.code}`);
  console.log(`    ${f.description}`);
}
