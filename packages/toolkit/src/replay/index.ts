/**
 * Replay engine module — v0.2.0.
 *
 * The replay engine takes a parsed trace and replays events in timestamp order,
 * emitting state transitions and failures. It is pure — no timers, no I/O.
 * The consumer (app or CLI) drives the clock.
 *
 * @module @ocpp-debugkit/toolkit/replay
 */

export { ReplayEngine, type ReplayEvent, type ReplayState, type ReplayOptions } from './engine.js';
