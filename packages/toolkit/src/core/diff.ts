/**
 * Trace diffing — compare two parsed traces and surface differences.
 *
 * Matches events by `messageId` (OCPP UniqueId), then compares:
 * - timestamp, direction, action, payload (deep equality), errorCode
 * - detected failures (by code)
 * - session summaries (human-readable difference strings)
 *
 * Pure function — no I/O, no side effects. Browser-safe (no Node built-ins).
 *
 * @module @ocpp-debugkit/toolkit/core
 */

import type { Event, Failure, ParseResult, SessionSummary } from './types.js';
import { detectFailures } from './detection.js';
import { buildSessionTimeline } from './timeline.js';
import { summarizeSessions } from './summarizer.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A field-level difference between two events that share a messageId. */
export interface EventDiff {
  /** The OCPP UniqueId shared by both events. */
  messageId: string;
  /** The field that differs. */
  field: 'timestamp' | 'direction' | 'action' | 'payload' | 'errorCode';
  /** The value in trace A (or null if the field was absent). */
  valueA: unknown;
  /** The value in trace B (or null if the field was absent). */
  valueB: unknown;
}

/** Summary-level differences between two traces. */
export interface SummaryDiff {
  /** Summary of trace A (or null if A has no sessions). */
  a: SessionSummary | null;
  /** Summary of trace B (or null if B has no sessions). */
  b: SessionSummary | null;
  /** Human-readable difference descriptions. */
  differences: string[];
}

/** The complete diff result between two traces. */
export interface TraceDiff {
  /** Events present in trace A but not B (by messageId). */
  onlyInA: Event[];
  /** Events present in trace B but not A (by messageId). */
  onlyInB: Event[];
  /** Events present in both but with field-level differences. */
  modified: EventDiff[];
  /** Failures detected in A but not B. */
  failuresOnlyInA: Failure[];
  /** Failures detected in B but not A. */
  failuresOnlyInB: Failure[];
  /** Summary differences. */
  summaryDiff: SummaryDiff;
}

// ---------------------------------------------------------------------------
// Deep equality check (limited — not a general-purpose deep-equal)
// ---------------------------------------------------------------------------

/**
 * Checks deep equality of two values. Handles primitives, arrays, and plain
 * objects. Does not handle Maps, Sets, Dates, or other complex types —
 * OCPP payloads are JSON-serializable data.
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, b[i]));
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const objA = a as Record<string, unknown>;
    const objB = b as Record<string, unknown>;
    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((key) => deepEqual(objA[key], objB[key]));
  }

  return false;
}

// ---------------------------------------------------------------------------
// Diff implementation
// ---------------------------------------------------------------------------

/**
 * Compare two parsed traces and return a structured diff.
 *
 * @param a - Parse result of trace A
 * @param b - Parse result of trace B
 * @returns A {@link TraceDiff} describing all differences
 *
 * @example
 * ```typescript
 * const resultA = parseTrace(traceAJson);
 * const resultB = parseTrace(traceBJson);
 * const diff = diffTraces(resultA, resultB);
 *
 * if (diff.onlyInA.length > 0) {
 *   console.log(`${diff.onlyInA.length} events only in trace A`);
 * }
 * ```
 */
export function diffTraces(a: ParseResult, b: ParseResult): TraceDiff {
  const messageIdsA = new Set(a.events.map((e) => e.messageId));
  const messageIdsB = new Set(b.events.map((e) => e.messageId));

  const onlyInA = a.events.filter((e) => !messageIdsB.has(e.messageId));
  const onlyInB = b.events.filter((e) => !messageIdsA.has(e.messageId));
  // Modified events (present in both but with differences)
  // Build maps for comparison — store arrays of events per messageId
  const mapA = new Map<string, Event[]>();
  const mapB = new Map<string, Event[]>();
  for (const event of a.events) {
    if (!messageIdsB.has(event.messageId)) continue;
    const existing = mapA.get(event.messageId);
    if (existing) {
      existing.push(event);
    } else {
      mapA.set(event.messageId, [event]);
    }
  }
  for (const event of b.events) {
    if (!messageIdsA.has(event.messageId)) continue;
    const existing = mapB.get(event.messageId);
    if (existing) {
      existing.push(event);
    } else {
      mapB.set(event.messageId, [event]);
    }
  }

  const modified: EventDiff[] = [];

  for (const [messageId, eventsA] of mapA) {
    const eventsB = mapB.get(messageId);
    if (!eventsB) continue;

    // Compare events at each position within the same messageId
    const maxLen = Math.max(eventsA.length, eventsB.length);
    for (let i = 0; i < maxLen; i++) {
      const eventA = eventsA[i];
      const eventB = eventsB[i];
      if (!eventA || !eventB) continue;

      if (eventA.timestamp !== eventB.timestamp) {
        modified.push({
          messageId,
          field: 'timestamp',
          valueA: eventA.timestamp,
          valueB: eventB.timestamp,
        });
      }
      if (eventA.direction !== eventB.direction) {
        modified.push({
          messageId,
          field: 'direction',
          valueA: eventA.direction,
          valueB: eventB.direction,
        });
      }
      if (eventA.action !== eventB.action) {
        modified.push({ messageId, field: 'action', valueA: eventA.action, valueB: eventB.action });
      }
      if (!deepEqual(eventA.payload, eventB.payload)) {
        modified.push({
          messageId,
          field: 'payload',
          valueA: eventA.payload,
          valueB: eventB.payload,
        });
      }
      if (eventA.errorCode !== eventB.errorCode) {
        modified.push({
          messageId,
          field: 'errorCode',
          valueA: eventA.errorCode,
          valueB: eventB.errorCode,
        });
      }
    }
  }

  // --- Failure diffing ---

  const sessionsA = buildSessionTimeline(a.events);
  const sessionsB = buildSessionTimeline(b.events);
  const failuresA = detectFailures(a.events, sessionsA);
  const failuresB = detectFailures(b.events, sessionsB);

  const failureCodesA = new Set(failuresA.map((f) => f.code));
  const failureCodesB = new Set(failuresB.map((f) => f.code));

  const failuresOnlyInA = failuresA.filter((f) => !failureCodesB.has(f.code));
  const failuresOnlyInB = failuresB.filter((f) => !failureCodesA.has(f.code));

  // --- Summary diffing ---

  const summariesA = summarizeSessions(sessionsA, failuresA);
  const summariesB = summarizeSessions(sessionsB, failuresB);

  const summaryA = summariesA.length > 0 ? (summariesA[0] as (typeof summariesA)[number]) : null;
  const summaryB = summariesB.length > 0 ? (summariesB[0] as (typeof summariesB)[number]) : null;

  const differences: string[] = [];

  if (summaryA && summaryB) {
    if (summaryA.eventCount !== summaryB.eventCount) {
      differences.push(`Event count: A=${summaryA.eventCount}, B=${summaryB.eventCount}`);
    }
    if (summaryA.failureCount !== summaryB.failureCount) {
      differences.push(`Failure count: A=${summaryA.failureCount}, B=${summaryB.failureCount}`);
    }
    if (summaryA.status !== summaryB.status) {
      differences.push(`Session status: A="${summaryA.status}", B="${summaryB.status}"`);
    }
    if (summaryA.durationMs !== summaryB.durationMs) {
      differences.push(`Duration: A=${summaryA.durationMs}ms, B=${summaryB.durationMs}ms`);
    }
    if (summaryA.transactionId !== summaryB.transactionId) {
      differences.push(`Transaction ID: A=${summaryA.transactionId}, B=${summaryB.transactionId}`);
    }
  } else if (summaryA && !summaryB) {
    differences.push('Trace A has sessions but trace B does not');
  } else if (!summaryA && summaryB) {
    differences.push('Trace B has sessions but trace A does not');
  }

  return {
    onlyInA,
    onlyInB,
    modified,
    failuresOnlyInA,
    failuresOnlyInB,
    summaryDiff: {
      a: summaryA,
      b: summaryB,
      differences,
    },
  };
}
