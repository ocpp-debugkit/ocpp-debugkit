/**
 * React components for @ocpp-debugkit/toolkit/react.
 *
 * These are presentational components — they accept data as props and
 * render UI. They are SSR-safe (no window/document access at module level).
 * No external CSS framework — uses inline styles for zero-dependency rendering.
 */

import type {
  SessionTimelineProps,
  MessageInspectorProps,
  FailureSummaryProps,
  ReportViewerProps,
  ReplayControlsProps,
} from './types.js';

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#dc2626',
  warning: '#f59e0b',
  info: '#3b82f6',
};

const styles = {
  container: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: '#1f2937',
  },
  list: {
    listStyle: 'none' as const,
    padding: 0,
    margin: 0,
  },
  listItem: {
    padding: '8px 12px',
    borderBottom: '1px solid #e5e7eb',
    cursor: 'pointer',
    fontSize: '13px',
  } as const,
  selectedItem: {
    backgroundColor: '#dbeafe',
  },
  badge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
    color: '#fff',
    marginRight: '6px',
  } as const,
  code: {
    fontFamily: 'monospace',
    fontSize: '12px',
    backgroundColor: '#f3f4f6',
    padding: '2px 4px',
    borderRadius: '3px',
  },
  section: {
    marginBottom: '16px',
  },
  heading: {
    fontSize: '14px',
    fontWeight: 600,
    marginBottom: '8px',
    color: '#374151',
  },
  empty: {
    color: '#9ca3af',
    fontStyle: 'italic' as const,
    padding: '12px',
  },
  button: {
    padding: '4px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    background: '#fff',
    cursor: 'pointer',
    fontSize: '13px',
    marginRight: '4px',
  },
  buttonActive: {
    background: '#3b82f6',
    color: '#fff',
    borderColor: '#3b82f6',
  },
  rangeInput: {
    width: '100%',
    margin: '8px 0',
  },
};

function formatTimestamp(ts: number | null): string {
  if (ts === null) return '—';
  return new Date(ts).toISOString().slice(11, 19);
}

export function SessionTimeline({ events, selectedEventId, onSelectEvent }: SessionTimelineProps) {
  if (events.length === 0) {
    return <div style={styles.empty}>No events in trace</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.heading}>Timeline ({events.length} events)</div>
      <ul style={styles.list}>
        {events.map((event, i) => (
          <li
            key={event.id}
            onClick={() => onSelectEvent?.(event.id)}
            style={{
              ...styles.listItem,
              ...(selectedEventId === event.id ? styles.selectedItem : {}),
            }}
          >
            <span style={{ color: '#9ca3af', marginRight: '8px' }}>{i}</span>
            <span style={{ color: '#6b7280', marginRight: '8px' }}>
              {formatTimestamp(event.timestamp)}
            </span>
            <span style={styles.code}>{event.messageType}</span>
            {event.action && (
              <span style={{ marginLeft: '6px', fontWeight: 500 }}>{event.action}</span>
            )}
            <span style={{ marginLeft: '8px', color: '#9ca3af' }}>{event.direction}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MessageInspector({ event }: MessageInspectorProps) {
  if (!event) {
    return <div style={styles.empty}>Select an event to inspect</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.heading}>Message Inspector</div>
      <div style={styles.section}>
        <strong>ID:</strong> <span style={styles.code}>{event.id}</span>
      </div>
      <div style={styles.section}>
        <strong>Message ID:</strong> <span style={styles.code}>{event.messageId}</span>
      </div>
      <div style={styles.section}>
        <strong>Type:</strong> {event.messageType}
      </div>
      <div style={styles.section}>
        <strong>Action:</strong> {event.action ?? '—'}
      </div>
      <div style={styles.section}>
        <strong>Direction:</strong> {event.direction}
      </div>
      <div style={styles.section}>
        <strong>Timestamp:</strong> {formatTimestamp(event.timestamp)}
      </div>
      <div style={styles.section}>
        <strong>Payload:</strong>
        <pre
          style={{
            ...styles.code,
            padding: '8px',
            overflowX: 'auto' as const,
            whiteSpace: 'pre-wrap' as const,
          }}
        >
          {JSON.stringify(event.payload, null, 2)}
        </pre>
      </div>
      <div style={styles.section}>
        <strong>Raw:</strong>
        <pre
          style={{
            ...styles.code,
            padding: '8px',
            overflowX: 'auto' as const,
            whiteSpace: 'pre-wrap' as const,
          }}
        >
          {JSON.stringify(event.rawMessage, null, 2)}
        </pre>
      </div>
    </div>
  );
}

export function FailureSummary({ failures }: FailureSummaryProps) {
  if (failures.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.heading}>Failures</div>
        <div style={styles.empty}>No failures detected</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.heading}>Failures ({failures.length})</div>
      <ul style={styles.list}>
        {failures.map((failure, i) => (
          <li key={`${failure.code}-${i}`} style={{ ...styles.listItem, cursor: 'default' }}>
            <span
              style={{
                ...styles.badge,
                backgroundColor: SEVERITY_COLORS[failure.severity] ?? '#6b7280',
              }}
            >
              {failure.severity.toUpperCase()}
            </span>
            <strong>{failure.code}</strong>
            <div style={{ marginTop: '4px', fontSize: '12px', color: '#6b7280' }}>
              {failure.description}
            </div>
            {failure.suggestedSteps.length > 0 && (
              <div style={{ marginTop: '4px', fontSize: '12px' }}>
                <strong>Suggested steps:</strong>
                <ul style={{ margin: '4px 0 0 20px', padding: 0 }}>
                  {failure.suggestedSteps.map((step, j) => (
                    <li key={j}>{step}</li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ReportViewer({ html }: ReportViewerProps) {
  return (
    <div style={styles.container}>
      <div style={styles.heading}>Report</div>
      <iframe
        srcDoc={html}
        style={{
          width: '100%',
          height: '500px',
          border: '1px solid #e5e7eb',
          borderRadius: '4px',
        }}
        title="OCPP DebugKit Report"
        sandbox="allow-same-origin"
      />
    </div>
  );
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
  return (
    <div style={styles.container}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <button
          onClick={onStepBack}
          disabled={currentIndex <= 0}
          style={{
            ...styles.button,
            opacity: currentIndex <= 0 ? 0.5 : 1,
          }}
        >
          ← Step Back
        </button>
        {isPlaying ? (
          <button onClick={onPause} style={{ ...styles.button, ...styles.buttonActive }}>
            ⏸ Pause
          </button>
        ) : (
          <button onClick={onPlay} style={{ ...styles.button, ...styles.buttonActive }}>
            ▶ Play
          </button>
        )}
        <button
          onClick={onStep}
          disabled={currentIndex >= totalEvents - 1}
          style={{
            ...styles.button,
            opacity: currentIndex >= totalEvents - 1 ? 0.5 : 1,
          }}
        >
          Step Forward →
        </button>
        <span style={{ marginLeft: '12px', fontSize: '13px', color: '#6b7280' }}>
          {currentIndex + 1} / {totalEvents}
        </span>
        {onSpeedChange && (
          <span style={{ marginLeft: '12px', fontSize: '13px' }}>
            <label htmlFor="replay-speed">Speed: </label>
            <select
              id="replay-speed"
              value={speed ?? 1}
              onChange={(e) => onSpeedChange(Number(e.currentTarget.value))}
              style={styles.button}
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={5}>5x</option>
            </select>
          </span>
        )}
      </div>
      <input
        type="range"
        min={0}
        max={Math.max(0, totalEvents - 1)}
        value={currentIndex}
        onChange={(e) => onJump(Number(e.currentTarget.value))}
        style={styles.rangeInput}
      />
    </div>
  );
}
