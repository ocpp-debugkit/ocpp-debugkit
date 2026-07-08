/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, it, expect } from 'vitest';
import { ReplayEngine } from './engine.js';
import type { Event, Failure, RawOcppMessage } from '../core/index.js';

// ---------------------------------------------------------------------------
// Helpers (same pattern as core/detection.test.ts)
// ---------------------------------------------------------------------------

function makeEvent(
  id: string,
  messageId: string,
  messageType: 'Call' | 'CallResult' | 'CallError',
  action: string | null,
  payload: unknown = {},
  timestamp: number | null = null,
  direction: 'CS_TO_CSMS' | 'CSMS_TO_CS' | 'UNKNOWN' = 'CS_TO_CSMS',
): Event {
  let rawMessage: RawOcppMessage;
  if (messageType === 'Call') {
    rawMessage = [2, messageId, action as string, payload];
  } else if (messageType === 'CallResult') {
    rawMessage = [3, messageId, payload];
  } else {
    rawMessage = [4, messageId, 'Error', 'desc', payload];
  }
  return {
    id,
    messageId,
    timestamp,
    direction,
    messageType,
    action,
    payload,
    errorCode: messageType === 'CallError' ? 'Error' : null,
    errorDescription: messageType === 'CallError' ? 'desc' : null,
    rawMessage,
  };
}

function makeFailure(
  code: Failure['code'],
  eventIds: string[],
  severity: Failure['severity'] = 'warning',
): Failure {
  return {
    code,
    description: `Failure for ${eventIds.join(', ')}`,
    severity,
    eventIds,
    suggestedSteps: ['Check configuration'],
  };
}

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

function threeEvents(): Event[] {
  return [
    makeEvent('evt-001', 'msg-001', 'Call', 'BootNotification', { station: 'CS-001' }, 1000),
    makeEvent('evt-002', 'msg-002', 'Call', 'Heartbeat', {}, 2000),
    makeEvent('evt-003', 'msg-003', 'Call', 'StatusNotification', { status: 'Available' }, 3000),
  ];
}

// ===========================================================================
// Construction
// ===========================================================================

describe('ReplayEngine — construction', () => {
  it('constructs with events and empty failures', () => {
    const engine = new ReplayEngine(threeEvents());
    expect(engine.totalEvents).toBe(3);
  });

  it('constructs with events and failures', () => {
    const failures = [makeFailure('FAILED_AUTHORIZATION', ['evt-001'])];
    const engine = new ReplayEngine(threeEvents(), failures);
    expect(engine.totalEvents).toBe(3);
  });

  it('constructs with options', () => {
    const engine = new ReplayEngine(threeEvents(), [], { speed: 2, startIndex: 0 });
    expect(engine.totalEvents).toBe(3);
  });

  it('does not mutate the original events array', () => {
    const events = threeEvents();
    const engine = new ReplayEngine(events);
    engine.step();
    engine.step();
    expect(events).toHaveLength(3);
  });

  it('does not mutate the original failures array', () => {
    const failures = [makeFailure('FAILED_AUTHORIZATION', ['evt-001'])];
    const engine = new ReplayEngine(threeEvents(), failures);
    engine.step();
    expect(failures).toHaveLength(1);
  });
});

// ===========================================================================
// totalEvents getter
// ===========================================================================

describe('ReplayEngine — totalEvents', () => {
  it('returns the number of events', () => {
    const engine = new ReplayEngine(threeEvents());
    expect(engine.totalEvents).toBe(3);
  });

  it('returns 0 for empty events', () => {
    const engine = new ReplayEngine([]);
    expect(engine.totalEvents).toBe(0);
  });

  it('returns 1 for a single event', () => {
    const engine = new ReplayEngine([makeEvent('e1', 'm1', 'Call', 'BootNotification', {}, 0)]);
    expect(engine.totalEvents).toBe(1);
  });
});

// ===========================================================================
// current getter
// ===========================================================================

describe('ReplayEngine — current', () => {
  it('starts at 0 for non-empty events', () => {
    const engine = new ReplayEngine(threeEvents());
    expect(engine.current).toBe(0);
  });

  it('returns -1 for empty events', () => {
    const engine = new ReplayEngine([]);
    expect(engine.current).toBe(-1);
  });

  it('advances after step()', () => {
    const engine = new ReplayEngine(threeEvents());
    engine.step();
    expect(engine.current).toBe(1);
  });

  it('reflects startIndex option', () => {
    const engine = new ReplayEngine(threeEvents(), [], { startIndex: 2 });
    expect(engine.current).toBe(2);
  });
});

// ===========================================================================
// step()
// ===========================================================================

describe('ReplayEngine — step()', () => {
  it('returns the first event on initial step', () => {
    const engine = new ReplayEngine(threeEvents());
    const result = engine.step();
    expect(result).not.toBeNull();
    expect(result!.event.id).toBe('evt-001');
    expect(result!.index).toBe(0);
  });

  it('returns the next event on subsequent step', () => {
    const engine = new ReplayEngine(threeEvents());
    engine.step();
    const result = engine.step();
    expect(result).not.toBeNull();
    expect(result!.event.id).toBe('evt-002');
    expect(result!.index).toBe(1);
  });

  it('returns null when complete', () => {
    const engine = new ReplayEngine(threeEvents());
    engine.step();
    engine.step();
    engine.step();
    expect(engine.step()).toBeNull();
  });

  it('includes an empty failures array when no failures match', () => {
    const engine = new ReplayEngine(threeEvents());
    const result = engine.step();
    expect(result!.failures).toEqual([]);
  });

  it('returns the event with index, event, and failures fields', () => {
    const engine = new ReplayEngine(threeEvents());
    const result = engine.step();
    expect(result).toHaveProperty('event');
    expect(result).toHaveProperty('failures');
    expect(result).toHaveProperty('index');
  });

  it('steps through all events in order', () => {
    const engine = new ReplayEngine(threeEvents());
    const ids = [];
    let r: ReturnType<ReplayEngine['step']> = null;
    while ((r = engine.step()) !== null) {
      ids.push(r.event.id);
    }
    expect(ids).toEqual(['evt-001', 'evt-002', 'evt-003']);
  });
});

// ===========================================================================
// stepBack()
// ===========================================================================

describe('ReplayEngine — stepBack()', () => {
  it('returns null at the start', () => {
    const engine = new ReplayEngine(threeEvents());
    expect(engine.stepBack()).toBeNull();
  });

  it('returns null after a single step', () => {
    const engine = new ReplayEngine(threeEvents());
    engine.step();
    expect(engine.stepBack()).toBeNull();
  });

  it('goes back one event after stepping forward twice', () => {
    const engine = new ReplayEngine(threeEvents());
    engine.step(); // index 0, current → 1
    engine.step(); // index 1, current → 2
    const result = engine.stepBack();
    expect(result).not.toBeNull();
    expect(result!.event.id).toBe('evt-001');
    expect(result!.index).toBe(0);
  });

  it('returns null for empty events', () => {
    const engine = new ReplayEngine([]);
    expect(engine.stepBack()).toBeNull();
  });
});

// ===========================================================================
// jumpTo()
// ===========================================================================

describe('ReplayEngine — jumpTo()', () => {
  it('jumps to a specific index and returns the event', () => {
    const engine = new ReplayEngine(threeEvents());
    const result = engine.jumpTo(2);
    expect(result).not.toBeNull();
    expect(result!.event.id).toBe('evt-003');
    expect(result!.index).toBe(2);
  });

  it('returns null for a negative index', () => {
    const engine = new ReplayEngine(threeEvents());
    expect(engine.jumpTo(-1)).toBeNull();
  });

  it('returns null for an index beyond the last event', () => {
    const engine = new ReplayEngine(threeEvents());
    expect(engine.jumpTo(3)).toBeNull();
  });

  it('returns null for an empty events array', () => {
    const engine = new ReplayEngine([]);
    expect(engine.jumpTo(0)).toBeNull();
  });

  it('updates the current index after jumping', () => {
    const engine = new ReplayEngine(threeEvents());
    engine.jumpTo(1);
    // After jumpTo(1) → step() runs, currentIndex becomes 2
    expect(engine.current).toBe(2);
  });
});

// ===========================================================================
// getState()
// ===========================================================================

describe('ReplayEngine — getState()', () => {
  it('returns empty played and all remaining at start', () => {
    const engine = new ReplayEngine(threeEvents());
    const state = engine.getState();
    expect(state.played).toHaveLength(0);
    expect(state.remaining).toHaveLength(3);
    expect(state.complete).toBe(false);
  });

  it('returns played events after stepping', () => {
    const engine = new ReplayEngine(threeEvents());
    engine.step(); // plays index 0
    const state = engine.getState();
    expect(state.played).toHaveLength(1);
    expect(state.played[0]!.event.id).toBe('evt-001');
    expect(state.remaining).toHaveLength(2);
    expect(state.remaining[0]!.id).toBe('evt-002');
    expect(state.complete).toBe(false);
  });

  it('returns complete=true when all events are played', () => {
    const engine = new ReplayEngine(threeEvents());
    engine.step();
    engine.step();
    engine.step();
    const state = engine.getState();
    expect(state.played).toHaveLength(3);
    expect(state.remaining).toHaveLength(0);
    expect(state.complete).toBe(true);
  });

  it('includes failures in played ReplayEvents', () => {
    const failures = [makeFailure('CONNECTOR_FAULT', ['evt-001'], 'critical')];
    const engine = new ReplayEngine(threeEvents(), failures);
    engine.step();
    const state = engine.getState();
    expect(state.played[0]!.failures).toHaveLength(1);
    expect(state.played[0]!.failures[0]!.code).toBe('CONNECTOR_FAULT');
  });

  it('returns empty played/remaining and complete=true for empty events', () => {
    const engine = new ReplayEngine([]);
    const state = engine.getState();
    expect(state.played).toHaveLength(0);
    expect(state.remaining).toHaveLength(0);
    expect(state.complete).toBe(true);
  });
});

// ===========================================================================
// reset()
// ===========================================================================

describe('ReplayEngine — reset()', () => {
  it('resets the current index to 0', () => {
    const engine = new ReplayEngine(threeEvents());
    engine.step();
    engine.step();
    engine.reset();
    expect(engine.current).toBe(0);
  });

  it('allows re-stepping from the beginning after reset', () => {
    const engine = new ReplayEngine(threeEvents());
    engine.step();
    engine.step();
    engine.reset();
    const result = engine.step();
    expect(result).not.toBeNull();
    expect(result!.event.id).toBe('evt-001');
    expect(result!.index).toBe(0);
  });

  it('reset on empty engine keeps current at -1', () => {
    const engine = new ReplayEngine([]);
    engine.reset();
    expect(engine.current).toBe(-1);
  });
});

// ===========================================================================
// Failures filtering
// ===========================================================================

describe('ReplayEngine — failures filtering', () => {
  it('only returns failures matching the current event id in step()', () => {
    const events = threeEvents();
    const failures = [
      makeFailure('FAILED_AUTHORIZATION', ['evt-001']),
      makeFailure('CONNECTOR_FAULT', ['evt-002'], 'critical'),
    ];
    const engine = new ReplayEngine(events, failures);

    const first = engine.step();
    expect(first!.failures).toHaveLength(1);
    expect(first!.failures[0]!.code).toBe('FAILED_AUTHORIZATION');

    const second = engine.step();
    expect(second!.failures).toHaveLength(1);
    expect(second!.failures[0]!.code).toBe('CONNECTOR_FAULT');

    const third = engine.step();
    expect(third!.failures).toHaveLength(0);
  });

  it('returns multiple failures matching the same event id', () => {
    const events = [makeEvent('e1', 'm1', 'Call', 'BootNotification', {}, 0)];
    const failures = [
      makeFailure('FAILED_AUTHORIZATION', ['e1']),
      makeFailure('CONNECTOR_FAULT', ['e1'], 'critical'),
    ];
    const engine = new ReplayEngine(events, failures);
    const result = engine.step();
    expect(result!.failures).toHaveLength(2);
  });

  it('does not include failures for other events', () => {
    const events = [
      makeEvent('e1', 'm1', 'Call', 'BootNotification', {}, 0),
      makeEvent('e2', 'm2', 'Call', 'Heartbeat', {}, 100),
    ];
    const failures = [makeFailure('CONNECTOR_FAULT', ['e2'], 'critical')];
    const engine = new ReplayEngine(events, failures);
    const result = engine.step(); // steps to e1
    expect(result!.failures).toHaveLength(0);
  });

  it('filters failures correctly in getState() played list', () => {
    const events = threeEvents();
    const failures = [
      makeFailure('FAILED_AUTHORIZATION', ['evt-001']),
      makeFailure('CONNECTOR_FAULT', ['evt-002'], 'critical'),
    ];
    const engine = new ReplayEngine(events, failures);
    engine.step();
    engine.step();
    const state = engine.getState();
    expect(state.played[0]!.failures).toHaveLength(1);
    expect(state.played[0]!.failures[0]!.code).toBe('FAILED_AUTHORIZATION');
    expect(state.played[1]!.failures).toHaveLength(1);
    expect(state.played[1]!.failures[0]!.code).toBe('CONNECTOR_FAULT');
  });
});

// ===========================================================================
// Edge cases
// ===========================================================================

describe('ReplayEngine — edge cases', () => {
  describe('empty events array', () => {
    it('totalEvents is 0', () => {
      const engine = new ReplayEngine([]);
      expect(engine.totalEvents).toBe(0);
    });

    it('current is -1', () => {
      const engine = new ReplayEngine([]);
      expect(engine.current).toBe(-1);
    });

    it('step() returns null', () => {
      const engine = new ReplayEngine([]);
      expect(engine.step()).toBeNull();
    });

    it('stepBack() returns null', () => {
      const engine = new ReplayEngine([]);
      expect(engine.stepBack()).toBeNull();
    });

    it('jumpTo(0) returns null', () => {
      const engine = new ReplayEngine([]);
      expect(engine.jumpTo(0)).toBeNull();
    });

    it('getState() returns complete=true with empty arrays', () => {
      const engine = new ReplayEngine([]);
      const state = engine.getState();
      expect(state.played).toHaveLength(0);
      expect(state.remaining).toHaveLength(0);
      expect(state.complete).toBe(true);
    });
  });

  describe('single event', () => {
    it('totalEvents is 1', () => {
      const engine = new ReplayEngine([makeEvent('e1', 'm1', 'Call', 'BootNotification', {}, 0)]);
      expect(engine.totalEvents).toBe(1);
    });

    it('step() returns the single event', () => {
      const engine = new ReplayEngine([makeEvent('e1', 'm1', 'Call', 'BootNotification', {}, 0)]);
      const result = engine.step();
      expect(result).not.toBeNull();
      expect(result!.event.id).toBe('e1');
      expect(result!.index).toBe(0);
    });

    it('step() returns null after the single event', () => {
      const engine = new ReplayEngine([makeEvent('e1', 'm1', 'Call', 'BootNotification', {}, 0)]);
      engine.step();
      expect(engine.step()).toBeNull();
    });

    it('stepBack() returns null after stepping', () => {
      const engine = new ReplayEngine([makeEvent('e1', 'm1', 'Call', 'BootNotification', {}, 0)]);
      engine.step();
      expect(engine.stepBack()).toBeNull();
    });

    it('getState() returns complete after stepping', () => {
      const engine = new ReplayEngine([makeEvent('e1', 'm1', 'Call', 'BootNotification', {}, 0)]);
      engine.step();
      const state = engine.getState();
      expect(state.played).toHaveLength(1);
      expect(state.remaining).toHaveLength(0);
      expect(state.complete).toBe(true);
    });
  });

  describe('options.startIndex', () => {
    it('starts at the given index', () => {
      const engine = new ReplayEngine(threeEvents(), [], { startIndex: 1 });
      expect(engine.current).toBe(1);
    });

    it('step() returns the event at startIndex', () => {
      const engine = new ReplayEngine(threeEvents(), [], { startIndex: 1 });
      const result = engine.step();
      expect(result).not.toBeNull();
      expect(result!.event.id).toBe('evt-002');
      expect(result!.index).toBe(1);
    });

    it('getState() reflects startIndex in played', () => {
      const engine = new ReplayEngine(threeEvents(), [], { startIndex: 1 });
      const state = engine.getState();
      expect(state.played).toHaveLength(1);
      expect(state.played[0]!.event.id).toBe('evt-001');
      expect(state.remaining).toHaveLength(2);
      expect(state.remaining[0]!.id).toBe('evt-002');
    });

    it('startIndex at last event', () => {
      const engine = new ReplayEngine(threeEvents(), [], { startIndex: 2 });
      expect(engine.current).toBe(2);
      const result = engine.step();
      expect(result).not.toBeNull();
      expect(result!.event.id).toBe('evt-003');
      // After stepping, should be complete
      expect(engine.step()).toBeNull();
    });

    it('defaults to 0 when startIndex not provided', () => {
      const engine = new ReplayEngine(threeEvents());
      expect(engine.current).toBe(0);
    });
  });
});
