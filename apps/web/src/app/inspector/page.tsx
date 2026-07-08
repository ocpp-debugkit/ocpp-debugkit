'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
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
} from '@ocpp-debugkit/toolkit/core';
import { generateMarkdownReport, generateHtmlReport } from '@ocpp-debugkit/toolkit/reporter';
import { scenarios } from '@ocpp-debugkit/toolkit/scenarios';
import { ReplayEngine } from '@ocpp-debugkit/toolkit/replay';

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

interface ReplayState {
  engine: ReplayEngine | null;
  currentIndex: number;
  isPlaying: boolean;
  speed: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function InspectorPage() {
  const [input, setInput] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisState | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [replay, setReplay] = useState<ReplayState>({
    engine: null,
    currentIndex: 0,
    isPlaying: false,
    speed: 1,
  });
  const [reportFormat, setReportFormat] = useState<'markdown' | 'html'>('markdown');
  const [view, setView] = useState<'inspect' | 'replay' | 'report'>('inspect');
  const timelineRef = useRef<HTMLDivElement>(null);

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
        error: 'Input is empty. Paste a trace or select a sample scenario.',
      });
      return;
    }

    setIsAnalyzing(true);

    // Use setTimeout to let the loading state render before heavy parsing
    setTimeout(() => {
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
        // Initialize replay engine
        setReplay({
          engine: new ReplayEngine(result.events, failures),
          currentIndex: 0,
          isPlaying: false,
          speed: 1,
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
      } finally {
        setIsAnalyzing(false);
      }
    }, 0);
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
        error: `File size (${file.size} bytes) exceeds the maximum allowed size (${MAX_INPUT_SIZE_BYTES} bytes).`,
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
    const reportData = {
      events: analysis.events,
      sessions: analysis.sessions,
      failures: analysis.failures,
      summaries: analysis.summaries,
      warnings: analysis.warnings,
    };
    const isHtml = reportFormat === 'html';
    const report = isHtml ? generateHtmlReport(reportData) : generateMarkdownReport(reportData);
    const blob = new Blob([report], {
      type: isHtml ? 'text/html' : 'text/markdown',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = isHtml ? 'ocpp-debugkit-report.html' : 'ocpp-debugkit-report.md';
    a.click();
    URL.revokeObjectURL(url);
  }, [analysis, reportFormat]);

  // Replay handlers
  const handleReplayStep = useCallback(() => {
    if (!replay.engine) return;
    const result = replay.engine.step();
    if (result) {
      setReplay({ ...replay, currentIndex: result.index });
      setAnalysis((prev) => (prev ? { ...prev, selectedEventId: result.event.id } : prev));
    }
  }, [replay]);

  const handleReplayStepBack = useCallback(() => {
    if (!replay.engine) return;
    const result = replay.engine.stepBack();
    if (result) {
      setReplay({ ...replay, currentIndex: result.index });
      setAnalysis((prev) => (prev ? { ...prev, selectedEventId: result.event.id } : prev));
    }
  }, [replay]);

  const handleReplayJump = useCallback(
    (index: number) => {
      if (!replay.engine) return;
      const result = replay.engine.jumpTo(index);
      if (result) {
        setReplay({ ...replay, currentIndex: result.index });
        setAnalysis((prev) => (prev ? { ...prev, selectedEventId: result.event.id } : prev));
      }
    },
    [replay],
  );

  const handleReplayPlay = useCallback(() => {
    setReplay({ ...replay, isPlaying: true });
  }, [replay]);

  const handleReplayPause = useCallback(() => {
    setReplay({ ...replay, isPlaying: false });
  }, [replay]);

  // Auto-advance replay when playing
  useMemo(() => {
    if (!replay.isPlaying || !replay.engine) return;
    const engine = replay.engine;
    const interval = setInterval(() => {
      const result = engine.step();
      if (result) {
        setReplay((prev) => ({ ...prev, currentIndex: result.index }));
        setAnalysis((prev) => (prev ? { ...prev, selectedEventId: result.event.id } : prev));
      } else {
        setReplay((prev) => ({ ...prev, isPlaying: false }));
      }
    }, 1000 / replay.speed);
    return () => clearInterval(interval);
  }, [replay.isPlaying, replay.speed]);

  // Keyboard navigation: arrow up/down to move between events
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!analysis || analysis.events.length === 0) return;
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;

      e.preventDefault();
      const currentIndex = analysis.events.findIndex((ev) => ev.id === analysis.selectedEventId);

      let nextIndex: number;
      if (e.key === 'ArrowDown') {
        nextIndex = currentIndex < 0 ? 0 : Math.min(currentIndex + 1, analysis.events.length - 1);
      } else {
        nextIndex = currentIndex <= 0 ? 0 : currentIndex - 1;
      }

      const nextEvent = analysis.events[nextIndex];
      if (nextEvent) {
        setAnalysis({ ...analysis, selectedEventId: nextEvent.id });
        // Scroll the timeline to the selected event
        const btn = timelineRef.current?.querySelector<HTMLButtonElement>(
          `[data-event-id="${nextEvent.id}"]`,
        );
        btn?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    },
    [analysis],
  );

  return (
    <div
      className="min-h-screen bg-neutral-50 dark:bg-neutral-950"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 flex items-center justify-between">
          <h1 className="text-lg font-bold text-neutral-900 dark:text-white sm:text-xl">
            OCPP Inspector
          </h1>
          {analysis && analysis.events.length > 0 && (
            <div className="flex items-center gap-2">
              <select
                value={reportFormat}
                onChange={(e) => setReportFormat(e.target.value as 'markdown' | 'html')}
                className="rounded-lg border border-neutral-300 px-2 py-1.5 text-xs text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 sm:text-sm"
              >
                <option value="markdown">Markdown</option>
                <option value="html">HTML</option>
              </select>
              <button
                onClick={handleExportReport}
                className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-black dark:hover:bg-neutral-200 sm:px-4 sm:py-2 sm:text-sm"
              >
                Export {reportFormat === 'html' ? 'HTML' : 'Report'}
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Input section */}
        <div className="grid gap-4 lg:grid-cols-3 sm:gap-6">
          {/* Trace input */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Paste OCPP Trace (JSON / JSONL)
            </label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="h-48 w-full rounded-lg border border-neutral-300 p-3 font-mono text-xs text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white sm:h-64 sm:p-4"
              placeholder='{"traceId":"...","metadata":{...},"events":[...]}'
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 sm:px-6"
              >
                {isAnalyzing ? 'Analyzing…' : 'Analyze'}
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
            <div className="flex flex-wrap gap-2 lg:flex-col lg:space-y-2">
              {scenarios.map((scenario) => (
                <button
                  key={scenario.name}
                  onClick={() => handleScenarioSelect(scenario)}
                  className="rounded-lg border border-neutral-300 px-3 py-1.5 text-left text-xs text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800 lg:w-full lg:px-4 lg:py-2 lg:text-sm"
                >
                  {scenario.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Loading indicator */}
        {isAnalyzing && (
          <div className="mt-6 flex items-center gap-3 rounded-lg border border-blue-300 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <span className="text-sm text-blue-800 dark:text-blue-200">Parsing trace…</span>
          </div>
        )}

        {/* Error */}
        {analysis?.error && !isAnalyzing && (
          <div className="mt-6 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
            <strong>Error:</strong> {analysis.error}
          </div>
        )}

        {/* Warnings */}
        {analysis && analysis.warnings.length > 0 && !isAnalyzing && (
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
        {analysis && analysis.events.length > 0 && !isAnalyzing && (
          <div className="mt-8 space-y-6">
            {/* View tabs */}
            <div className="flex gap-2 border-b border-neutral-200 dark:border-neutral-800">
              {(['inspect', 'replay', 'report'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setView(tab)}
                  className={`px-4 py-2 text-sm font-medium capitalize ${
                    view === tab
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Inspect view */}
            {view === 'inspect' && (
              <>
                {/* Summary stats */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                  <StatCard label="Events" value={analysis.events.length} />
                  <StatCard label="Sessions" value={analysis.sessions.length} />
                  <StatCard label="Failures" value={analysis.failures.length} />
                  <StatCard label="Warnings" value={analysis.warnings.length} />
                </div>

                {/* Failures */}
                {analysis.failures.length > 0 && (
                  <div data-testid="failure-summary">
                    <h2 className="text-base font-semibold text-neutral-900 dark:text-white mb-3 sm:text-lg">
                      Failures ({analysis.failures.length})
                    </h2>
                    <div className="space-y-3">
                      {analysis.failures.map((failure, i) => (
                        <div
                          key={i}
                          className="rounded-lg border border-neutral-300 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-900 sm:p-4"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span>
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
                <div className="grid gap-4 lg:grid-cols-2 sm:gap-6">
                  {/* Timeline */}
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="text-base font-semibold text-neutral-900 dark:text-white sm:text-lg">
                        Event Timeline
                      </h2>
                      <span className="text-xs text-neutral-500">
                        {analysis.events.length} events · ↑↓ to navigate
                      </span>
                    </div>
                    <div
                      ref={timelineRef}
                      className="max-h-64 overflow-y-auto rounded-lg border border-neutral-300 dark:border-neutral-700 sm:max-h-96"
                    >
                      {analysis.events.map((event) => (
                        <button
                          key={event.id}
                          data-event-id={event.id}
                          onClick={() => setAnalysis({ ...analysis, selectedEventId: event.id })}
                          className={`block w-full border-b border-neutral-200 px-3 py-2 text-left text-xs hover:bg-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-800 sm:px-4 ${
                            analysis.selectedEventId === event.id
                              ? 'bg-blue-50 dark:bg-blue-950'
                              : ''
                          }`}
                        >
                          <div className="flex flex-wrap items-center gap-2">
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
                    <h2 className="text-base font-semibold text-neutral-900 dark:text-white mb-3 sm:text-lg">
                      Message Inspector
                    </h2>
                    {selectedEvent ? (
                      <div className="rounded-lg border border-neutral-300 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-900 sm:p-4">
                        <dl className="space-y-1 text-sm sm:space-y-2">
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
                            <Detail label="Error Desc" value={selectedEvent.errorDescription} />
                          )}
                        </dl>
                        <div className="mt-4">
                          <p className="mb-1 text-xs font-medium text-neutral-500">Raw Message</p>
                          <pre className="overflow-x-auto rounded bg-neutral-100 p-2 text-xs dark:bg-neutral-800 sm:p-3">
                            <code>{JSON.stringify(selectedEvent.rawMessage, null, 2)}</code>
                          </pre>
                        </div>
                        <div className="mt-3">
                          <p className="mb-1 text-xs font-medium text-neutral-500">Payload</p>
                          <pre className="overflow-x-auto rounded bg-neutral-100 p-2 text-xs dark:bg-neutral-800 sm:p-3">
                            <code>{JSON.stringify(selectedEvent.payload, null, 2)}</code>
                          </pre>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700 sm:p-8">
                        Select an event from the timeline to inspect its details.
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
            {view === 'replay' && replay.engine && (
              <ReplayView
                engine={replay.engine}
                currentIndex={replay.currentIndex}
                isPlaying={replay.isPlaying}
                speed={replay.speed}
                selectedEvent={selectedEvent}
                failures={analysis.failures}
                onStep={handleReplayStep}
                onStepBack={handleReplayStepBack}
                onJump={handleReplayJump}
                onPlay={handleReplayPlay}
                onPause={handleReplayPause}
                onSpeedChange={(speed: number) => setReplay({ ...replay, speed })}
              />
            )}

            {/* Report view */}
            {view === 'report' && (
              <div data-testid="report-view">
                {reportFormat === 'html' ? (
                  <iframe
                    srcDoc={generateHtmlReport({
                      events: analysis.events,
                      sessions: analysis.sessions,
                      failures: analysis.failures,
                      summaries: analysis.summaries,
                      warnings: analysis.warnings,
                    })}
                    className="h-[600px] w-full rounded-lg border border-neutral-300 dark:border-neutral-700"
                    title="OCPP DebugKit Report"
                    sandbox="allow-same-origin"
                  />
                ) : (
                  <pre className="overflow-x-auto rounded-lg border border-neutral-300 bg-white p-4 text-xs dark:border-neutral-700 dark:bg-neutral-900">
                    <code>
                      {generateMarkdownReport({
                        events: analysis.events,
                        sessions: analysis.sessions,
                        failures: analysis.failures,
                        summaries: analysis.summaries,
                        warnings: analysis.warnings,
                      })}
                    </code>
                  </pre>
                )}
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!analysis && !isAnalyzing && (
          <div className="mt-12 text-center">
            <p className="text-sm text-neutral-500 sm:text-base">
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
    <div className="rounded-lg border border-neutral-300 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-900 sm:p-4">
      <p className="text-xl font-bold text-neutral-900 dark:text-white sm:text-2xl">{value}</p>
      <p className="text-xs text-neutral-500">{label}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="min-w-28 font-medium text-neutral-500 sm:min-w-32">{label}:</dt>
      <dd className="break-all text-neutral-900 dark:text-white">{value}</dd>
    </div>
  );
}

function ReplayView({
  engine,
  currentIndex,
  isPlaying,
  speed,
  selectedEvent,
  failures,
  onStep,
  onStepBack,
  onJump,
  onPlay,
  onPause,
  onSpeedChange,
}: {
  engine: ReplayEngine;
  currentIndex: number;
  isPlaying: boolean;
  speed: number;
  selectedEvent: Event | null;
  failures: Failure[];
  onStep: () => void;
  onStepBack: () => void;
  onJump: (index: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onSpeedChange: (speed: number) => void;
}) {
  const totalEvents = engine.totalEvents;
  const eventFailures = selectedEvent
    ? failures.filter((f) => f.eventIds.includes(selectedEvent.id))
    : [];

  return (
    <div className="space-y-4" data-testid="replay-view">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={onStepBack}
          disabled={currentIndex <= 0}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300"
        >
          ← Back
        </button>
        {isPlaying ? (
          <button
            onClick={onPause}
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-500"
          >
            ⏸ Pause
          </button>
        ) : (
          <button
            onClick={onPlay}
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-500"
          >
            ▶ Play
          </button>
        )}
        <button
          onClick={onStep}
          disabled={currentIndex >= totalEvents - 1}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300"
        >
          Forward →
        </button>
        <span className="text-sm text-neutral-500">
          {currentIndex + 1} / {totalEvents}
        </span>
        <select
          value={speed}
          onChange={(e) => onSpeedChange(Number(e.target.value))}
          className="rounded-lg border border-neutral-300 px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
        >
          <option value={0.5}>0.5x</option>
          <option value={1}>1x</option>
          <option value={2}>2x</option>
          <option value={5}>5x</option>
        </select>
      </div>
      <input
        type="range"
        min={0}
        max={Math.max(0, totalEvents - 1)}
        value={currentIndex}
        onChange={(e) => onJump(Number(e.target.value))}
        className="w-full"
      />
      {selectedEvent && (
        <div className="rounded-lg border border-neutral-300 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-neutral-500">{selectedEvent.id}</span>
            <span
              className={
                selectedEvent.messageType === 'Call'
                  ? 'text-blue-600'
                  : selectedEvent.messageType === 'CallResult'
                    ? 'text-green-600'
                    : 'text-red-600'
              }
            >
              {selectedEvent.messageType}
            </span>
            {selectedEvent.action && (
              <span className="font-medium text-neutral-900 dark:text-white">
                {selectedEvent.action}
              </span>
            )}
            <span className="text-neutral-500">{selectedEvent.direction}</span>
          </div>
          <pre className="mt-2 overflow-x-auto rounded bg-neutral-100 p-2 text-xs dark:bg-neutral-800">
            <code>{JSON.stringify(selectedEvent.payload, null, 2)}</code>
          </pre>
          {eventFailures.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-medium text-red-600">Failures at this event:</p>
              {eventFailures.map((f, i) => (
                <div key={i} className="text-sm text-red-700 dark:text-red-300">
                  <strong>{f.code}</strong>: {f.description}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
