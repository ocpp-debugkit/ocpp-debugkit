/**
 * Input types for the reporter package.
 *
 * These types represent the analysis result that reporters consume.
 * They are produced by the core package's parseTrace + buildSessionTimeline +
 * detectFailures pipeline.
 */

import type { Event, Failure, Session, SessionSummary } from '../core/index.js';

/** Analysis result passed to report generators. */
export interface AnalysisResult {
  /** All normalized events from the trace. */
  events: Event[];
  /** Sessions derived from the events. */
  sessions: Session[];
  /** Failures detected in the trace. */
  failures: Failure[];
  /** Summaries for each session. */
  summaries: SessionSummary[];
  /** Warnings produced during parsing. */
  warnings: { index: number; message: string; rawInput?: string }[];
  /** Trace metadata, if available. */
  metadata?: {
    traceId?: string;
    stationId?: string;
    ocppVersion?: string;
    source?: string;
    description?: string;
  };
}
