/**
 * Prop types for the React components in @ocpp-debugkit/toolkit/react.
 */

import type { Event, Failure, SessionSummary } from '../core/index.js';

export interface SessionTimelineProps {
  events: Event[];
  selectedEventId?: string | null;
  onSelectEvent?: (eventId: string) => void;
}

export interface MessageInspectorProps {
  event: Event | null;
}

export interface FailureSummaryProps {
  failures: Failure[];
}

export interface ReportViewerProps {
  /** The HTML report string (from generateHtmlReport). */
  html: string;
}

export interface ReplayControlsProps {
  isPlaying: boolean;
  currentIndex: number;
  totalEvents: number;
  onPlay: () => void;
  onPause: () => void;
  onStep: () => void;
  onStepBack: () => void;
  onJump: (index: number) => void;
  speed?: number;
  onSpeedChange?: (speed: number) => void;
}

// Summary type re-export for consumers
export type { SessionSummary };
