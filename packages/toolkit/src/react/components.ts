/**
 * React component stubs for @ocpp-debugkit/toolkit/react.
 *
 * v0.2.0: These are stub implementations — presentational components
 * that will be fully extracted from the Inspector in Phase 4.
 * They are functional but minimal, using no external CSS framework.
 */

import type {
  SessionTimelineProps,
  MessageInspectorProps,
  FailureSummaryProps,
  ReportViewerProps,
  ReplayControlsProps,
} from './types.js';

export function SessionTimeline({ events, selectedEventId, onSelectEvent }: SessionTimelineProps) {
  return {
    type: 'SessionTimeline',
    props: { events, selectedEventId, onSelectEvent },
  } as const;
}

export function MessageInspector({ event }: MessageInspectorProps) {
  return {
    type: 'MessageInspector',
    props: { event },
  } as const;
}

export function FailureSummary({ failures }: FailureSummaryProps) {
  return {
    type: 'FailureSummary',
    props: { failures },
  } as const;
}

export function ReportViewer({ html }: ReportViewerProps) {
  return {
    type: 'ReportViewer',
    props: { html },
  } as const;
}

export function ReplayControls({
  isPlaying,
  currentIndex,
  totalEvents,
  onPlay,
  onPause,
  onStep,
  onStepBack,
  onJump,
  speed,
  onSpeedChange,
}: ReplayControlsProps) {
  return {
    type: 'ReplayControls',
    props: {
      isPlaying,
      currentIndex,
      totalEvents,
      onPlay,
      onPause,
      onStep,
      onStepBack,
      onJump,
      speed,
      onSpeedChange,
    },
  } as const;
}
