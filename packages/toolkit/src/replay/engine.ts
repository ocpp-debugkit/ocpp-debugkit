/**
 * Replay engine — replays OCPP trace events in timestamp order.
 *
 * @module @ocpp-debugkit/toolkit/replay
 */

import type { Event, Failure } from '../core/index.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReplayEvent {
  /** The normalized event. */
  event: Event;
  /** Failures detected at this event's position. */
  failures: Failure[];
  /** Zero-based index in the original event array. */
  index: number;
}

export interface ReplayState {
  /** Events replayed so far. */
  played: ReplayEvent[];
  /** Events remaining. */
  remaining: Event[];
  /** Whether the replay is complete. */
  complete: boolean;
}

export interface ReplayOptions {
  /** Playback speed multiplier (1 = real-time, 2 = 2x, etc.). Default: 1. */
  speed?: number;
  /** Start from this event index. Default: 0. */
  startIndex?: number;
}

// ---------------------------------------------------------------------------
// ReplayEngine
// ---------------------------------------------------------------------------

/**
 * Deterministic replay engine for OCPP traces.
 *
 * The engine is pure — it does not use timers or I/O. The consumer
 * calls `step()`, `stepBack()`, or `jumpTo()` to advance the replay.
 */
export class ReplayEngine {
  private readonly events: Event[];
  private readonly failures: Failure[];
  private currentIndex: number;

  constructor(events: Event[], failures: Failure[] = [], options?: ReplayOptions) {
    this.events = [...events];
    this.failures = [...failures];
    this.currentIndex = options?.startIndex ?? 0;
  }

  /** Total number of events. */
  get totalEvents(): number {
    return this.events.length;
  }

  /** Current event index (0-based). Returns -1 if no events. */
  get current(): number {
    return this.events.length === 0 ? -1 : this.currentIndex;
  }

  /** Step forward one event. Returns the replay event, or null if complete. */
  step(): ReplayEvent | null {
    if (this.currentIndex >= this.events.length) {
      return null;
    }
    const event = this.events[this.currentIndex];
    if (!event) {
      return null;
    }
    const index = this.currentIndex;
    const failures = this.failures.filter((f) => f.eventIds.includes(event.id));
    this.currentIndex++;
    return { event, failures, index };
  }

  /** Step backward one event. Returns the replay event, or null if at start. */
  stepBack(): ReplayEvent | null {
    if (this.currentIndex <= 1) {
      return null;
    }
    this.currentIndex -= 2;
    return this.step();
  }

  /** Jump to a specific event index. Returns the replay event, or null if out of range. */
  jumpTo(index: number): ReplayEvent | null {
    if (index < 0 || index >= this.events.length) {
      return null;
    }
    this.currentIndex = index;
    return this.step();
  }

  /** Get the current replay state snapshot. */
  getState(): ReplayState {
    const played = [];
    for (let i = 0; i < this.currentIndex && i < this.events.length; i++) {
      const event = this.events[i];
      if (!event) continue;
      played.push({
        event,
        failures: this.failures.filter((f) => f.eventIds.includes(event.id)),
        index: i,
      });
    }
    return {
      played,
      remaining: this.events.slice(this.currentIndex),
      complete: this.currentIndex >= this.events.length,
    };
  }

  /** Reset the replay to the beginning. */
  reset(): void {
    this.currentIndex = 0;
  }
}
