import { describe, it, expect } from 'vitest';
import {
  fixtures,
  normalSession,
  failedAuth,
  connectorFault,
  fixtureNames,
} from './fixtures/index.js';
import type { Trace, TraceEventInput, RawOcppMessage } from './types.js';

// ---------------------------------------------------------------------------
// Helpers — lightweight validation logic that mirrors the proposed model.
// Full parser + Zod schemas will be implemented in v0.1.0 (Issue #13).
// ---------------------------------------------------------------------------

const VALID_DIRECTIONS = new Set(['CS_TO_CSMS', 'CSMS_TO_CS', 'UNKNOWN']);

/** Validate that a value looks like a Trace (JSON Object format). */
function assertTraceShape(trace: unknown): asserts trace is Trace {
  expect(trace).toBeDefined();
  expect(typeof trace).toBe('object');
  const t = trace as Record<string, unknown>;
  expect(Array.isArray(t.events)).toBe(true);
  expect((t.events as unknown[]).length).toBeGreaterThan(0);
}

/** Validate a single trace event input against the proposed model. */
function assertEventShape(ev: unknown, _index: number): asserts ev is TraceEventInput {
  expect(ev).toBeDefined();
  expect(typeof ev).toBe('object');
  const e = ev as Record<string, unknown>;

  // message is required and must be an array
  expect(e.message).toBeDefined();
  expect(Array.isArray(e.message)).toBe(true);

  const msg = e.message as unknown[];
  expect(msg.length).toBeGreaterThanOrEqual(3);
  expect(typeof msg[0]).toBe('number'); // MessageTypeId
  expect(typeof msg[1]).toBe('string'); // UniqueId

  // MessageTypeId must be 2, 3, or 4
  expect([2, 3, 4]).toContain(msg[0]);

  // Call (type 2) needs at least 4 elements: [2, id, action, payload]
  if (msg[0] === 2) {
    expect(msg.length).toBeGreaterThanOrEqual(4);
    expect(typeof msg[2]).toBe('string'); // Action
  }

  // CallResult (type 3) needs at least 3 elements: [3, id, payload]
  if (msg[0] === 3) {
    expect(msg.length).toBeGreaterThanOrEqual(3);
  }

  // CallError (type 4) needs at least 5 elements: [4, id, code, desc, details]
  if (msg[0] === 4) {
    expect(msg.length).toBeGreaterThanOrEqual(5);
    expect(typeof msg[2]).toBe('string'); // ErrorCode
  }

  // direction (optional) must be valid if present
  if (e.direction !== undefined && e.direction !== null) {
    expect(VALID_DIRECTIONS.has(e.direction as string)).toBe(true);
  }

  // timestamp (optional) must be string or number if present
  if (e.timestamp !== undefined && e.timestamp !== null) {
    expect(['string', 'number']).toContain(typeof e.timestamp);
  }
}

/** Assert all events in a trace are well-shaped. */
function assertAllEvents(trace: Trace): void {
  trace.events.forEach((ev, i) => assertEventShape(ev, i));
}

/** Check for Call / CallResult correlation by messageId. */
function assertCallResponsePairs(trace: Trace): void {
  const callIds = new Set<string>();
  const responseIds = new Set<string>();

  for (const ev of trace.events) {
    const msg = ev.message as RawOcppMessage;
    const msgTypeId = msg[0];
    const uniqueId = msg[1];

    if (msgTypeId === 2) {
      callIds.add(uniqueId);
    } else {
      responseIds.add(uniqueId);
    }
  }

  // Every response should have a matching Call (unless it's the first message)
  for (const respId of responseIds) {
    if (!callIds.has(respId)) {
      throw new Error(`Response with messageId "${respId}" has no matching Call`);
    }
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Synthetic trace fixtures', () => {
  describe('fixture registry', () => {
    it('exports exactly 3 fixtures', () => {
      expect(Object.keys(fixtures)).toHaveLength(3);
    });

    it('exports fixture names', () => {
      expect(fixtureNames).toEqual(['normal-session', 'failed-auth', 'connector-fault']);
    });

    it('each fixture is individually exported', () => {
      expect(normalSession).toBeDefined();
      expect(failedAuth).toBeDefined();
      expect(connectorFault).toBeDefined();
    });
  });

  describe('normal-session fixture', () => {
    it('conforms to the Trace shape', () => {
      assertTraceShape(normalSession);
    });

    it('all events conform to the proposed event model', () => {
      assertTraceShape(normalSession);
      assertAllEvents(normalSession);
    });

    it('has matching Call/CallResult pairs', () => {
      assertCallResponsePairs(normalSession);
    });

    it('contains a complete charging session flow', () => {
      const actions = normalSession.events
        .filter((e) => e.message[0] === 2)
        .map((e) => e.message[2] as string);

      expect(actions).toContain('BootNotification');
      expect(actions).toContain('Authorize');
      expect(actions).toContain('StartTransaction');
      expect(actions).toContain('MeterValues');
      expect(actions).toContain('StopTransaction');
    });

    it('has consistent transactionId in StartTransaction response and StopTransaction', () => {
      const startResp = normalSession.events.find(
        (e) => e.message[0] === 3 && e.message[1] === 'msg-005',
      );
      const stopReq = normalSession.events.find(
        (e) => e.message[0] === 2 && e.message[2] === 'StopTransaction',
      );

      expect(startResp).toBeDefined();
      expect(stopReq).toBeDefined();

      const startPayload = (startResp as TraceEventInput).message[2] as {
        transactionId?: number;
      };
      const stopPayload = (stopReq as TraceEventInput).message[3] as {
        transactionId?: number;
      };

      expect(startPayload.transactionId).toBe(100001);
      expect(stopPayload.transactionId).toBe(100001);
    });

    it('has chronological timestamps', () => {
      const timestamps = normalSession.events
        .map((e) => (typeof e.timestamp === 'string' ? Date.parse(e.timestamp) : null))
        .filter((t): t is number => t !== null);

      for (let i = 1; i < timestamps.length; i++) {
        const prev = timestamps[i - 1];
        const curr = timestamps[i];
        if (prev !== undefined && curr !== undefined) {
          expect(curr).toBeGreaterThanOrEqual(prev);
        }
      }
    });

    it('uses synthetic identifiers (no real data)', () => {
      const json = JSON.stringify(normalSession);
      expect(json).toContain('SYNTHETIC');
      expect(json).not.toMatch(/\b[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}\b/i);
    });
  });

  describe('failed-auth fixture', () => {
    it('conforms to the Trace shape', () => {
      assertTraceShape(failedAuth);
    });

    it('all events conform to the proposed event model', () => {
      assertTraceShape(failedAuth);
      assertAllEvents(failedAuth);
    });

    it('has matching Call/CallResult pairs', () => {
      assertCallResponsePairs(failedAuth);
    });

    it('contains rejected Authorize responses', () => {
      const authResps = failedAuth.events.filter(
        (e) => e.message[0] === 3 && e.message[1].startsWith('msg-00'),
      );

      const rejected = authResps.filter((e) => {
        const payload = e.message[2] as { idTagInfo?: { status?: string } };
        return payload?.idTagInfo?.status === 'Invalid';
      });

      expect(rejected.length).toBeGreaterThanOrEqual(1);
    });

    it('does not contain StartTransaction (auth failed)', () => {
      const actions = failedAuth.events
        .filter((e) => e.message[0] === 2)
        .map((e) => e.message[2] as string);

      expect(actions).not.toContain('StartTransaction');
    });

    it('transitions connector to Faulted after auth failure', () => {
      const statusNotifs = failedAuth.events.filter(
        (e) => e.message[0] === 2 && e.message[2] === 'StatusNotification',
      );

      const lastStatus = statusNotifs.at(-1);
      expect(lastStatus).toBeDefined();
      const payload = (lastStatus as TraceEventInput).message[3] as {
        status?: string;
      };
      expect(payload.status).toBe('Faulted');
    });
  });

  describe('connector-fault fixture', () => {
    it('conforms to the Trace shape', () => {
      assertTraceShape(connectorFault);
    });

    it('all events conform to the proposed event model', () => {
      assertTraceShape(connectorFault);
      assertAllEvents(connectorFault);
    });

    it('has matching Call/CallResult pairs', () => {
      assertCallResponsePairs(connectorFault);
    });

    it('contains a Faulted StatusNotification during active session', () => {
      const faultStatus = connectorFault.events.find(
        (e) =>
          e.message[0] === 2 &&
          e.message[2] === 'StatusNotification' &&
          (e.message[3] as { status?: string }).status === 'Faulted',
      );

      expect(faultStatus).toBeDefined();
      const payload = (faultStatus as TraceEventInput).message[3] as {
        errorCode?: string;
      };
      expect(payload.errorCode).not.toBe('NoError');
    });

    it('has StopTransaction with Faulted reason after connector fault', () => {
      const stopTx = connectorFault.events.find(
        (e) => e.message[0] === 2 && e.message[2] === 'StopTransaction',
      );

      expect(stopTx).toBeDefined();
      const payload = (stopTx as TraceEventInput).message[3] as {
        reason?: string;
      };
      expect(payload.reason).toBe('Faulted');
    });

    it('has a StartTransaction before the StopTransaction', () => {
      const events = connectorFault.events;
      const startIdx = events.findIndex(
        (e) => e.message[0] === 2 && e.message[2] === 'StartTransaction',
      );
      const stopIdx = events.findIndex(
        (e) => e.message[0] === 2 && e.message[2] === 'StopTransaction',
      );

      expect(startIdx).toBeGreaterThanOrEqual(0);
      expect(stopIdx).toBeGreaterThan(startIdx);
    });
  });

  describe('all fixtures — synthetic data policy', () => {
    it.each([
      ['normal-session', normalSession],
      ['failed-auth', failedAuth],
      ['connector-fault', connectorFault],
    ])('%s contains only synthetic identifiers', (_name, trace) => {
      const json = JSON.stringify(trace);
      // Must contain SYNTHETIC marker in identifiers
      expect(json).toContain('SYNTHETIC');
      // Must not contain UUID-like patterns (real station serials often look like UUIDs)
      expect(json).not.toMatch(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i);
    });

    it.each([
      ['normal-session', normalSession],
      ['failed-auth', failedAuth],
      ['connector-fault', connectorFault],
    ])('%s declares ocppVersion 1.6', (_name, trace) => {
      expect(trace.metadata?.ocppVersion).toBe('1.6');
    });
  });
});
