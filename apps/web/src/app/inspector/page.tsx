'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  parseTrace,
  buildSessionTimeline,
  detectFailures,
  summarizeSessions,
  type Event,
  type Failure,
  type Session,
  type SessionSummary,
  type ParseWarning,
  type Scenario,
  ParseError,
  MAX_INPUT_SIZE_BYTES,
} from '@ocpp-debugkit/core';
import { generateMarkdownReport } from '@ocpp-debugkit/reporter';
import { scenarios } from '@ocpp-debugkit/scenarios';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AnalysisState {
  events: Event[];
  sessions: Session[];
  failures: Failure[];
  summaries: SessionSummary[];
  warnings: ParseWarning[];
  selectedEventId: string | null;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function InspectorPage() {
  const [input, setInput] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisState | null>(null);

  const selectedEvent = useMemo(() => {
    if (!analysis || !analysis.selectedEventId) return null;
    return analysis.events.find((e) => e.id === analysis.selectedEventId) ?? null;
  }, [analysis]);

  const handleAnalyze = useCallback(() => {
    if (!input.trim()) {
      setAnalysis({
        events: [],
        sessions: [],
        failures: [],
        summaries: [],
        warnings: [],
        selectedEventId: null,
        error: 'Input is empty.',
      });
      return;
    }

    try {
      const result = parseTrace(input);
      const sessions = buildSessionTimeline(result.events);
      const failures = detectFailures(result.events, sessions);
      const summaries = summarizeSessions(sessions, failures);

      setAnalysis({
        events: result.events,
        sessions,
        failures,
        summaries,
        warnings: result.warnings,
        selectedEventId: null,
        error: null,
      });
    } catch (e) {
      const message =
        e instanceof ParseError ? e.message : e instanceof Error ? e.message : 'Unknown error';
      setAnalysis({
        events: [],
        sessions: [],
        failures: [],
        summaries: [],
        warnings: [],
        selectedEventId: null,
        error: message,
      });
    }
  }, [input]);

  const handleFileUpload = useCallback(async (file: File) => {
    if (file.size > MAX_INPUT_SIZE_BYTES) {
      setAnalysis({
        events: [],
        sessions: [],
        failures: [],
        summaries: [],
        warnings: [],
        selectedEventId: null,
        error: `File size exceeds ${MAX_INPUT_SIZE_BYTES} bytes.`,
      });
      return;
    }
    const text = await file.text();
    setInput(text);
  }, []);

  const handleScenarioSelect = useCallback((scenario: Scenario) => {
    setInput(JSON.stringify(scenario.trace, null, 2));
  }, []);

  const handleExportReport = useCallback(() => {
    if (!analysis) return;
    const report = generateMarkdownReport({
      events: analysis.events,
      sessions: analysis.sessions,
      failures: analysis.failures,
      summaries: analysis.summaries,
      warnings: analysis.warnings,
    });
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ocpp-debugkit-report.md';
    a.click();
    URL.revokeObjectURL(url);
  }, [analysis]);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-neutral-900 dark:text-white">OCPP Inspector</h1>
          {analysis && analysis.events.length > 0 && (
            <button
              onClick={handleExportReport}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
            >
              Export Report
            </button>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Input section */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Trace input */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Paste OCPP Trace (JSON / JSONL)
            </label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="h-64 w-full rounded-lg border border-neutral-300 p-4 font-mono text-xs text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
              placeholder='{"traceId":"...","metadata":{...},"events":[...]}'
            />
            <div className="mt-2 flex gap-2">
              <button
                onClick={handleAnalyze}
                className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-500"
              >
                Analyze
              </button>
              <label className="cursor-pointer rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800">
                Upload File
                <input
                  type="file"
                  accept=".json,.jsonl,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />
              </label>
            </div>
          </div>

          {/* Sample scenarios */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Sample Scenarios
            </label>
            <div className="space-y-2">
              {scenarios.map((scenario) => (
                <button
                  key={scenario.name}
                  onClick={() => handleScenarioSelect(scenario)}
                  className="block w-full rounded-lg border border-neutral-300 px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  {scenario.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error */}
        {analysis?.error && (
          <div className="mt-6 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
            <strong>Error:</strong> {analysis.error}
          </div>
        )}

        {/* Warnings */}
        {analysis && analysis.warnings.length > 0 && (
          <div className="mt-6 rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
            <strong>{analysis.warnings.length} parse warning(s):</strong>
            <ul className="mt-2 list-disc list-inside">
              {analysis.warnings.slice(0, 10).map((w, i) => (
                <li key={i}>{w.message}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Results */}
        {analysis && analysis.events.length > 0 && (
          <div className="mt-8 space-y-6">
            {/* Summary stats */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard label="Events" value={analysis.events.length} />
              <StatCard label="Sessions" value={analysis.sessions.length} />
              <StatCard label="Failures" value={analysis.failures.length} />
              <StatCard label="Warnings" value={analysis.warnings.length} />
            </div>

            {/* Failures */}
            {analysis.failures.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3">
                  Failures ({analysis.failures.length})
                </h2>
                <div className="space-y-3">
                  {analysis.failures.map((failure, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-neutral-300 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={
                            failure.severity === 'critical'
                              ? 'text-red-600'
                              : failure.severity === 'warning'
                                ? 'text-yellow-600'
                                : 'text-blue-600'
                          }
                        >
                          {failure.severity === 'critical'
                            ? '🔴'
                            : failure.severity === 'warning'
                              ? '🟡'
                              : '🔵'}
                        </span>
                        <span className="font-medium text-neutral-900 dark:text-white">
                          {failure.code}
                        </span>
                        <span className="text-xs text-neutral-500 uppercase">
                          {failure.severity}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                        {failure.description}
                      </p>
                      {failure.suggestedSteps.length > 0 && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs text-neutral-500">
                            Suggested steps
                          </summary>
                          <ol className="mt-1 list-decimal list-inside text-xs text-neutral-600 dark:text-neutral-400">
                            {failure.suggestedSteps.map((step, j) => (
                              <li key={j}>{step}</li>
                            ))}
                          </ol>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline + Message Inspector */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Timeline */}
              <div>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3">
                  Event Timeline
                </h2>
                <div className="max-h-96 overflow-y-auto rounded-lg border border-neutral-300 dark:border-neutral-700">
                  {analysis.events.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => setAnalysis({ ...analysis, selectedEventId: event.id })}
                      className={`block w-full border-b border-neutral-200 px-4 py-2 text-left text-xs hover:bg-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-800 ${
                        analysis.selectedEventId === event.id ? 'bg-blue-50 dark:bg-blue-950' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-neutral-500">{event.id}</span>
                        <span
                          className={
                            event.messageType === 'Call'
                              ? 'text-blue-600'
                              : event.messageType === 'CallResult'
                                ? 'text-green-600'
                                : 'text-red-600'
                          }
                        >
                          {event.messageType}
                        </span>
                        {event.action && (
                          <span className="font-medium text-neutral-900 dark:text-white">
                            {event.action}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-neutral-500">
                        {event.timestamp !== null
                          ? new Date(event.timestamp).toISOString()
                          : 'no timestamp'}{' '}
                        · {event.direction}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Message inspector */}
              <div>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3">
                  Message Inspector
                </h2>
                {selectedEvent ? (
                  <div className="rounded-lg border border-neutral-300 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
                    <dl className="space-y-2 text-sm">
                      <Detail label="Event ID" value={selectedEvent.id} />
                      <Detail label="Message ID" value={selectedEvent.messageId} />
                      <Detail label="Type" value={selectedEvent.messageType} />
                      <Detail label="Action" value={selectedEvent.action ?? '—'} />
                      <Detail label="Direction" value={selectedEvent.direction} />
                      <Detail
                        label="Timestamp"
                        value={
                          selectedEvent.timestamp !== null
                            ? new Date(selectedEvent.timestamp).toISOString()
                            : 'null'
                        }
                      />
                      {selectedEvent.errorCode && (
                        <Detail label="Error Code" value={selectedEvent.errorCode} />
                      )}
                      {selectedEvent.errorDescription && (
                        <Detail label="Error Description" value={selectedEvent.errorDescription} />
                      )}
                    </dl>
                    <div className="mt-4">
                      <p className="text-xs font-medium text-neutral-500 mb-1">Raw Message</p>
                      <pre className="overflow-x-auto rounded bg-neutral-100 p-3 text-xs dark:bg-neutral-800">
                        <code>{JSON.stringify(selectedEvent.rawMessage, null, 2)}</code>
                      </pre>
                    </div>
                    <div className="mt-3">
                      <p className="text-xs font-medium text-neutral-500 mb-1">Payload</p>
                      <pre className="overflow-x-auto rounded bg-neutral-100 p-3 text-xs dark:bg-neutral-800">
                        <code>{JSON.stringify(selectedEvent.payload, null, 2)}</code>
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-700">
                    Select an event from the timeline to inspect its details.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!analysis && (
          <div className="mt-12 text-center">
            <p className="text-neutral-500">
              Paste a trace, upload a file, or select a sample scenario to begin.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-neutral-300 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
      <p className="text-2xl font-bold text-neutral-900 dark:text-white">{value}</p>
      <p className="text-xs text-neutral-500">{label}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="font-medium text-neutral-500 min-w-32">{label}:</dt>
      <dd className="text-neutral-900 dark:text-white">{value}</dd>
    </div>
  );
}
