/**
 * Session timeline builder — correlates events into logical charging sessions.
 *
 * Session correlation strategy (ADR-0006):
 * 1. Primary: transactionId (from StartTransaction response / StopTransaction)
 * 2. Secondary: connectorId + stationId grouping
 * 3. Events without a transaction are grouped by stationId + connectorId
 *
 * @see ADR-0006
 */

import type { Event, Session } from './types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract transactionId from an event's payload.
 * - StartTransaction response (CallResult): { transactionId, idTagInfo }
 * - StopTransaction request (Call): { transactionId, ... }
 * - MeterValues request (Call): { transactionId, ... }
 */
function extractTransactionId(event: Event): number | null {
  if (event.messageType === 'Call') {
    if (event.action === 'StartTransaction') {
      // StartTransaction request doesn't have transactionId — the response does.
      return null;
    }
    if (event.action === 'StopTransaction' || event.action === 'MeterValues') {
      const payload = event.payload as { transactionId?: unknown };
      if (typeof payload?.transactionId === 'number') {
        return payload.transactionId;
      }
    }
  }

  if (event.messageType === 'CallResult') {
    const payload = event.payload as { transactionId?: unknown };
    if (typeof payload?.transactionId === 'number') {
      return payload.transactionId;
    }
  }

  return null;
}

/**
 * Extract connectorId from an event's payload.
 * Present in StatusNotification, StartTransaction, MeterValues.
 */
function extractConnectorId(event: Event): number | null {
  if (event.messageType !== 'Call' || event.payload === null) {
    return null;
  }
  const payload = event.payload as { connectorId?: unknown };
  if (typeof payload?.connectorId === 'number') {
    return payload.connectorId;
  }
  return null;
}

/**
 * Extract stationId from BootNotification payload.
 */
function extractStationId(events: Event[]): string {
  for (const event of events) {
    if (event.messageType === 'Call' && event.action === 'BootNotification') {
      const payload = event.payload as { chargePointSerialNumber?: unknown };
      if (typeof payload?.chargePointSerialNumber === 'string') {
        return payload.chargePointSerialNumber;
      }
    }
  }
  return 'unknown';
}

/**
 * Determine if an event indicates a connector fault status.
 */
function isFaultedStatus(event: Event): boolean {
  if (event.messageType !== 'Call' || event.action !== 'StatusNotification') {
    return false;
  }
  const payload = event.payload as { status?: unknown };
  return payload?.status === 'Faulted';
}

/**
 * Determine if an event indicates the connector is unavailable/offline.
 */
function isUnavailableStatus(event: Event): boolean {
  if (event.messageType !== 'Call' || event.action !== 'StatusNotification') {
    return false;
  }
  const payload = event.payload as { status?: unknown };
  return payload?.status === 'Unavailable' || payload?.status === 'Offline';
}

// ---------------------------------------------------------------------------
// buildSessionTimeline()
// ---------------------------------------------------------------------------

/**
 * Build session timelines from normalized events.
 *
 * Correlates events into logical charging sessions by:
 * 1. Matching StartTransaction responses to find transactionIds
 * 2. Grouping StopTransaction and MeterValues events by transactionId
 * 3. Grouping StatusNotification events by connectorId + stationId
 * 4. Events without a transaction are assigned to a "no-session" group
 *
 * Sessions are ordered by their first event's timestamp.
 *
 * @see ADR-0006
 */
export function buildSessionTimeline(events: Event[]): Session[] {
  if (events.length === 0) {
    return [];
  }

  const stationId = extractStationId(events);

  // Step 1: Build a map of messageId → transactionId from StartTransaction responses.
  // The StartTransaction Call (msg-005) gets a response (CallResult) with transactionId.
  // We match by messageId.
  const messageIdToTransactionId = new Map<string, number>();

  for (const event of events) {
    if (event.messageType === 'CallResult') {
      const txId = extractTransactionId(event);
      if (txId !== null) {
        messageIdToTransactionId.set(event.messageId, txId);
      }
    }
  }

  // Step 2: Build a map of messageId → transactionId for StopTransaction/MeterValues Calls.
  // These Calls contain the transactionId in their payload directly.
  const callMessageIdToTransactionId = new Map<string, number>();
  for (const event of events) {
    if (event.messageType === 'Call') {
      const txId = extractTransactionId(event);
      if (txId !== null) {
        callMessageIdToTransactionId.set(event.messageId, txId);
      }
    }
  }

  // Step 3: Group events into sessions.
  // A session is identified by a transactionId.
  // Events are assigned to a session if:
  // - They contain that transactionId in their payload (StopTransaction, MeterValues)
  // - They are a StartTransaction Call/CallResult with a matched messageId
  // - They are StatusNotification events for the same connectorId around the same time

  // First, find all StartTransaction Call messages and their corresponding response transactionIds
  const startTxCalls: {
    callEvent: Event;
    responseEvent: Event | null;
    transactionId: number | null;
  }[] = [];

  for (const event of events) {
    if (event.messageType === 'Call' && event.action === 'StartTransaction') {
      const txId = messageIdToTransactionId.get(event.messageId) ?? null;
      const responseEvent =
        events.find((e) => e.messageId === event.messageId && e.messageType === 'CallResult') ??
        null;
      startTxCalls.push({ callEvent: event, responseEvent, transactionId: txId });
    }
  }

  // If no transactions found, return a single session with all events
  if (startTxCalls.length === 0) {
    return [createSession('session-0', stationId, events)];
  }

  // Build a map of messageId → transactionId for ALL Call messages that have
  // a transactionId (StopTransaction, MeterValues). Their CallResult responses
  // inherit this transactionId.
  const callMessageIdToTxId = new Map<string, number>();
  for (const event of events) {
    if (event.messageType === 'Call') {
      const txId = extractTransactionId(event);
      if (txId !== null) {
        callMessageIdToTxId.set(event.messageId, txId);
      }
      // StartTransaction Call — get txId from the response
      if (event.action === 'StartTransaction') {
        const respTxId = messageIdToTransactionId.get(event.messageId);
        if (respTxId !== undefined) {
          callMessageIdToTxId.set(event.messageId, respTxId);
        }
      }
    }
  }

  // Group events by transactionId
  const sessionEventsMap = new Map<number | null, Event[]>();

  for (const event of events) {
    let txId: number | null = null;

    if (event.messageType === 'Call') {
      // Call: check if this messageId has a known transactionId
      txId = callMessageIdToTxId.get(event.messageId) ?? null;
      if (txId === null) {
        // Try extracting from payload directly
        txId = extractTransactionId(event);
      }
    } else if (event.messageType === 'CallResult') {
      // CallResult: check if the matching Call has a transactionId
      txId = callMessageIdToTxId.get(event.messageId) ?? null;
      // Also check if transactionId is directly in the response payload
      if (txId === null) {
        txId = extractTransactionId(event);
      }
    }

    if (txId !== null) {
      const group = sessionEventsMap.get(txId) ?? [];
      group.push(event);
      sessionEventsMap.set(txId, group);
    } else {
      // Events without a transaction — assign to null group (will be distributed)
      const group = sessionEventsMap.get(null) ?? [];
      group.push(event);
      sessionEventsMap.set(null, group);
    }
  }

  // Distribute null-group events to sessions by connectorId and time proximity
  const nullEvents = sessionEventsMap.get(null) ?? [];
  sessionEventsMap.delete(null);
  const usedNullEventIds = new Set<string>();

  // Build sessions
  const sessions: Session[] = [];
  let sessionIndex = 0;

  for (const [txId, txEvents] of sessionEventsMap) {
    // Find connectorId from the StartTransaction Call
    const startTxCall = txEvents.find(
      (e) => e.messageType === 'Call' && e.action === 'StartTransaction',
    );
    const connectorId = startTxCall ? extractConnectorId(startTxCall) : null;

    // Include null-group events that belong to this session's connector
    // and time range, or that are responses to Calls already in the session.
    const txMessageIds = new Set(txEvents.map((e) => e.messageId));
    const sessionStart = txEvents[0]?.timestamp ?? null;
    const sessionEnd = txEvents[txEvents.length - 1]?.timestamp ?? null;

    const relatedNullEvents = nullEvents.filter((e) => {
      // Skip already-used events
      if (usedNullEventIds.has(e.id)) return false;

      // Include CallResult/CallError that match a Call already in the session
      if (e.messageType !== 'Call' && txMessageIds.has(e.messageId)) {
        return true;
      }

      const eventConnectorId = extractConnectorId(e);
      // Include events with matching connectorId within time range
      if (eventConnectorId !== null && connectorId !== null && eventConnectorId === connectorId) {
        if (sessionStart !== null && sessionEnd !== null && e.timestamp !== null) {
          return e.timestamp >= sessionStart && e.timestamp <= sessionEnd + 60000; // 1 min grace
        }
        return true; // No timestamps — include
      }

      // Include BootNotification events at the start
      if (e.action === 'BootNotification' || e.action === 'Heartbeat') {
        // Only include if this is the first session
        return sessionIndex === 0;
      }

      // Include events without connectorId (like Authorize) within time range
      // (extending before session start to include pre-session events like Authorize)
      if (
        eventConnectorId === null &&
        e.messageType === 'Call' &&
        e.action !== 'BootNotification' &&
        e.action !== 'Heartbeat'
      ) {
        if (sessionStart !== null && sessionEnd !== null && e.timestamp !== null) {
          // Include if within 5 minutes before session start through 1 min after end
          return e.timestamp >= sessionStart - 300000 && e.timestamp <= sessionEnd + 60000;
        }
      }

      return false;
    });

    // Mark these null events as used so they aren't included in other sessions
    for (const e of relatedNullEvents) {
      usedNullEventIds.add(e.id);
    }

    const allEvents = [...txEvents, ...relatedNullEvents].sort((a, b) => {
      // Sort by original event order (ID is sequential)
      return a.id.localeCompare(b.id);
    });

    sessions.push(
      createSession(`session-${sessionIndex}`, stationId, allEvents, connectorId, txId),
    );
    sessionIndex++;
  }

  // Sort sessions by start time
  sessions.sort((a, b) => {
    if (a.startTime === null) return 1;
    if (b.startTime === null) return -1;
    return a.startTime - b.startTime;
  });

  // Renumber sessions
  sessions.forEach((s, i) => {
    s.sessionId = `session-${i}`;
  });

  return sessions;
}

// ---------------------------------------------------------------------------
// createSession helper
// ---------------------------------------------------------------------------

function createSession(
  sessionId: string,
  stationId: string,
  events: Event[],
  connectorId: number | null = null,
  transactionId: number | null = null,
): Session {
  const timestamps = events.map((e) => e.timestamp).filter((t): t is number => t !== null);

  const startTime = timestamps.length > 0 ? Math.min(...timestamps) : null;
  const endTime = timestamps.length > 0 ? Math.max(...timestamps) : null;

  // Determine session status
  let status: Session['status'] = 'active';
  const hasStop = events.some((e) => e.messageType === 'Call' && e.action === 'StopTransaction');
  const hasFaulted = events.some(isFaultedStatus);
  const hasUnavailable = events.some(isUnavailableStatus);

  if (hasStop) {
    status = 'completed';
  } else if (hasFaulted || hasUnavailable) {
    status = 'aborted';
  }

  // If we didn't get a transactionId from parameter, try to extract it
  if (transactionId === null) {
    for (const event of events) {
      const txId = extractTransactionId(event);
      if (txId !== null) {
        transactionId = txId;
        break;
      }
    }
  }

  return {
    sessionId,
    stationId,
    connectorId,
    transactionId,
    startTime,
    endTime,
    events,
    status,
  };
}
