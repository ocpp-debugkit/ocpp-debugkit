/**
 * Failure detection — analyzes events and sessions for known failure patterns.
 *
 * Three detection rules in v0.1:
 * 1. FAILED_AUTHORIZATION — Authorize response with idTagInfo.status = "Invalid"
 * 2. CONNECTOR_FAULT — StatusNotification with status = "Faulted" during active session
 * 3. STATION_OFFLINE_DURING_SESSION — session has StartTransaction but no StopTransaction,
 *    or connector transitions to Unavailable/Offline during an active transaction
 *
 * @see ADR-0003
 */

import type { Event, Failure, FailureCode, FailureSeverity, Session } from './types.js';

// ---------------------------------------------------------------------------
// Suggested steps per failure code
// ---------------------------------------------------------------------------

const SUGGESTED_STEPS: Record<FailureCode, string[]> = {
  FAILED_AUTHORIZATION: [
    'Verify the idTag is valid and not expired',
    'Check the CSMS local authorization list',
    'Ensure the idTag is not blocked or deactivated',
    'Review the Authorize response payload for rejection reason',
  ],
  CONNECTOR_FAULT: [
    'Inspect the physical connector for damage or debris',
    'Check the connector lock mechanism',
    'Review the errorCode field for specific fault type',
    'Check station logs for hardware diagnostics',
    'Contact hardware vendor if fault persists',
  ],
  STATION_OFFLINE_DURING_SESSION: [
    'Check the network connection between station and CSMS',
    'Verify the station has not lost power',
    'Review the WebSocket connection stability',
    'Check if the station firmware has a known stability issue',
    'Investigate if maintenance was performed on the station',
  ],
};

const SEVERITY: Record<FailureCode, FailureSeverity> = {
  FAILED_AUTHORIZATION: 'warning',
  CONNECTOR_FAULT: 'critical',
  STATION_OFFLINE_DURING_SESSION: 'critical',
};

// ---------------------------------------------------------------------------
// Payload extraction helpers
// ---------------------------------------------------------------------------

/** Extract idTagInfo.status from an Authorize CallResult. */
function getAuthorizeStatus(event: Event): string | null {
  if (event.messageType !== 'CallResult') return null;
  const payload = event.payload as { idTagInfo?: { status?: unknown } };
  if (typeof payload?.idTagInfo?.status === 'string') {
    return payload.idTagInfo.status;
  }
  return null;
}

/** Extract status from a StatusNotification Call. */
function getStatusNotificationStatus(event: Event): string | null {
  if (event.messageType !== 'Call' || event.action !== 'StatusNotification') return null;
  const payload = event.payload as { status?: unknown };
  if (typeof payload?.status === 'string') {
    return payload.status;
  }
  return null;
}

/** Extract errorCode from a StatusNotification Call. */
function getStatusNotificationErrorCode(event: Event): string | null {
  if (event.messageType !== 'Call' || event.action !== 'StatusNotification') return null;
  const payload = event.payload as { errorCode?: unknown };
  if (typeof payload?.errorCode === 'string') {
    return payload.errorCode;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Detection rules
// ---------------------------------------------------------------------------

/**
 * Rule 1: FAILED_AUTHORIZATION
 * Detects Authorize responses where idTagInfo.status is "Invalid".
 */
function detectFailedAuthorization(events: Event[]): Failure[] {
  const failures: Failure[] = [];

  for (const event of events) {
    // Look for Authorize CallResult responses
    if (event.messageType !== 'CallResult') continue;

    // Check if the matching Call was an Authorize
    // We match by messageId — find the Call with the same messageId
    const matchingCall = events.find(
      (e) =>
        e.messageType === 'Call' && e.action === 'Authorize' && e.messageId === event.messageId,
    );

    if (!matchingCall) continue;

    const status = getAuthorizeStatus(event);
    if (status === 'Invalid') {
      failures.push({
        code: 'FAILED_AUTHORIZATION',
        description: `Authorization rejected: idTag returned "Invalid" status (messageId: ${event.messageId})`,
        severity: SEVERITY.FAILED_AUTHORIZATION,
        eventIds: [matchingCall.id, event.id],
        suggestedSteps: SUGGESTED_STEPS.FAILED_AUTHORIZATION,
      });
    }
  }

  return failures;
}

/**
 * Rule 2: CONNECTOR_FAULT
 * Detects StatusNotification with status = "Faulted" during an active session.
 * A "during active session" means there's a StartTransaction before the fault
 * and either no StopTransaction yet, or the fault occurs before the StopTransaction.
 */
function detectConnectorFault(events: Event[]): Failure[] {
  const failures: Failure[] = [];

  // Find all StartTransaction Call events
  const startTxIndices = events
    .filter((e) => e.messageType === 'Call' && e.action === 'StartTransaction')
    .map((e) => events.indexOf(e));

  for (const startIndex of startTxIndices) {
    const startEvent = events[startIndex];
    if (!startEvent) continue;

    // Find the corresponding StopTransaction (after this StartTransaction)
    let stopIndex = -1;
    for (let i = startIndex + 1; i < events.length; i++) {
      const ev = events[i];
      if (ev && ev.messageType === 'Call' && ev.action === 'StopTransaction') {
        stopIndex = i;
        break;
      }
    }

    // Look for Faulted StatusNotification between StartTransaction and StopTransaction
    // (or until the end of events if no StopTransaction)
    const searchEnd = stopIndex > -1 ? stopIndex : events.length;

    for (let i = startIndex; i < searchEnd; i++) {
      const event = events[i];
      if (!event) continue;

      const status = getStatusNotificationStatus(event);
      if (status === 'Faulted') {
        const errorCode = getStatusNotificationErrorCode(event);
        failures.push({
          code: 'CONNECTOR_FAULT',
          description: `Connector fault detected during active session: status "Faulted"${errorCode ? `, errorCode "${errorCode}"` : ''} (messageId: ${event.messageId})`,
          severity: SEVERITY.CONNECTOR_FAULT,
          eventIds: [startEvent.id, event.id],
          suggestedSteps: SUGGESTED_STEPS.CONNECTOR_FAULT,
        });
        break; // Only report one fault per session
      }
    }
  }

  return failures;
}

/**
 * Rule 3: STATION_OFFLINE_DURING_SESSION
 * Detects sessions where:
 * - There's a StartTransaction but no StopTransaction (session never completed)
 * - OR the connector transitions to Unavailable/Offline during an active transaction
 */
function detectStationOfflineDuringSession(_events: Event[], sessions: Session[]): Failure[] {
  const failures: Failure[] = [];

  for (const session of sessions) {
    if (session.transactionId === null) continue;

    const hasStart = session.events.some(
      (e) => e.messageType === 'Call' && e.action === 'StartTransaction',
    );
    const hasStop = session.events.some(
      (e) => e.messageType === 'Call' && e.action === 'StopTransaction',
    );

    if (hasStart && !hasStop) {
      // Session never completed — station went offline or stopped communicating
      failures.push({
        code: 'STATION_OFFLINE_DURING_SESSION',
        description: `Session ${session.sessionId} (transaction ${session.transactionId}) has a StartTransaction but no StopTransaction — station may have gone offline during an active session`,
        severity: SEVERITY.STATION_OFFLINE_DURING_SESSION,
        eventIds: session.events
          .filter((e) => e.messageType === 'Call' && e.action === 'StartTransaction')
          .map((e) => e.id),
        suggestedSteps: SUGGESTED_STEPS.STATION_OFFLINE_DURING_SESSION,
      });
      continue;
    }

    // Check for Unavailable/Offline status during the session
    if (hasStart && hasStop) {
      const startIndex = session.events.findIndex(
        (e) => e.messageType === 'Call' && e.action === 'StartTransaction',
      );
      const stopIndex = session.events.findIndex(
        (e) => e.messageType === 'Call' && e.action === 'StopTransaction',
      );

      for (let i = startIndex; i <= stopIndex; i++) {
        const event = session.events[i];
        if (!event) continue;
        const status = getStatusNotificationStatus(event);
        if (status === 'Unavailable' || status === 'Offline') {
          failures.push({
            code: 'STATION_OFFLINE_DURING_SESSION',
            description: `Station reported "${status}" status during active session ${session.sessionId} (transaction ${session.transactionId})`,
            severity: SEVERITY.STATION_OFFLINE_DURING_SESSION,
            eventIds: [event.id],
            suggestedSteps: SUGGESTED_STEPS.STATION_OFFLINE_DURING_SESSION,
          });
          break;
        }
      }
    }
  }

  return failures;
}

// ---------------------------------------------------------------------------
// detectFailures()
// ---------------------------------------------------------------------------

/**
 * Detect failures in a trace by analyzing events and sessions.
 *
 * @param events - All normalized events from the trace
 * @param sessions - Sessions derived from the events
 * @returns Array of detected failures
 *
 * @see ADR-0003
 */
export function detectFailures(events: Event[], sessions: Session[]): Failure[] {
  const failures: Failure[] = [];

  // Rule 1: Failed authorization
  failures.push(...detectFailedAuthorization(events));

  // Rule 2: Connector fault during active session
  failures.push(...detectConnectorFault(events));

  // Rule 3: Station offline during session
  failures.push(...detectStationOfflineDuringSession(events, sessions));

  return failures;
}
