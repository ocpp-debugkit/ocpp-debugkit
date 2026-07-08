/**
 * Failure detection — analyzes events and sessions for known failure patterns.
 *
 * 10 detection rules (v0.1 + v0.2):
 *
 * v0.1:
 * 1. FAILED_AUTHORIZATION — Authorize response with idTagInfo.status = "Invalid"
 * 2. CONNECTOR_FAULT — StatusNotification with status = "Faulted" during active session
 * 3. STATION_OFFLINE_DURING_SESSION — session has StartTransaction but no StopTransaction
 *
 * v0.2:
 * 4. TIMEOUT_NO_HEARTBEAT — no Heartbeat within expected interval after BootNotification
 * 5. METER_VALUE_GAP — no MeterValues during an active transaction
 * 6. INVALID_STOP_REASON — StopTransaction with unexpected/invalid stop reason
 * 7. UNEXPECTED_START — StartTransaction without preceding BootNotification or Authorize
 * 8. STATUS_TRANSITION_VIOLATION — illegal connector status transition
 * 9. DIAGNOSTICS_FAILURE — DiagnosticsStatusNotification indicating failure
 * 10. FIRMWARE_UPDATE_FAILURE — FirmwareStatusNotification indicating failure
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
  TIMEOUT_NO_HEARTBEAT: [
    'Check the station network connectivity',
    'Verify the WebSocket connection is stable',
    'Review the station heartbeat interval configuration',
    'Check if the station has rebooted or lost power',
    'Inspect the CSMS for connection acceptance issues',
  ],
  METER_VALUE_GAP: [
    'Verify the meter is functioning correctly',
    'Check the meter value reporting interval configuration',
    'Inspect the OCPP connection stability during the session',
    'Review station logs for meter communication errors',
    'Consider hardware replacement if meter is faulty',
  ],
  INVALID_STOP_REASON: [
    'Review the StopTransaction payload for the stop reason',
    'Check if the stop reason is within the OCPP 1.6 specification',
    'Investigate why the station used a non-standard reason',
    'Review station firmware for stop reason mapping bugs',
  ],
  UNEXPECTED_START: [
    'Verify the station performed BootNotification before starting a transaction',
    'Check if authorization was properly completed before StartTransaction',
    'Review the station startup sequence and timing',
    'Inspect the CSMS for delayed or missing responses',
  ],
  STATUS_TRANSITION_VIOLATION: [
    'Review the connector status transition sequence',
    'Check if the station firmware follows the OCPP status model correctly',
    'Verify no manual overrides triggered invalid transitions',
    'Inspect the connector status history for anomalies',
  ],
  DIAGNOSTICS_FAILURE: [
    'Review the DiagnosticsStatusNotification payload for the specific status',
    'Check the station diagnostic logs for detailed error information',
    'Verify the station hardware diagnostics are passing',
    'Contact hardware vendor if diagnostics indicate hardware failure',
  ],
  FIRMWARE_UPDATE_FAILURE: [
    'Review the FirmwareStatusNotification payload for the specific status',
    'Check if the firmware image was corrupted or incomplete',
    'Verify the station has sufficient storage for the firmware update',
    'Retry the firmware update after addressing the failure cause',
    'Contact the firmware provider if the image is defective',
  ],
};

const SEVERITY: Record<FailureCode, FailureSeverity> = {
  FAILED_AUTHORIZATION: 'warning',
  CONNECTOR_FAULT: 'critical',
  STATION_OFFLINE_DURING_SESSION: 'critical',
  TIMEOUT_NO_HEARTBEAT: 'warning',
  METER_VALUE_GAP: 'warning',
  INVALID_STOP_REASON: 'info',
  UNEXPECTED_START: 'warning',
  STATUS_TRANSITION_VIOLATION: 'warning',
  DIAGNOSTICS_FAILURE: 'critical',
  FIRMWARE_UPDATE_FAILURE: 'warning',
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

  // v0.1 rules
  failures.push(...detectFailedAuthorization(events));
  failures.push(...detectConnectorFault(events));
  failures.push(...detectStationOfflineDuringSession(events, sessions));

  // v0.2 rules
  failures.push(...detectTimeoutNoHeartbeat(events));
  failures.push(...detectMeterValueGap(events, sessions));
  failures.push(...detectInvalidStopReason(events));
  failures.push(...detectUnexpectedStart(events));
  failures.push(...detectStatusTransitionViolation(events));
  failures.push(...detectDiagnosticsFailure(events));
  failures.push(...detectFirmwareUpdateFailure(events));

  return failures;
}

// ---------------------------------------------------------------------------
// v0.2 detection rules
// ---------------------------------------------------------------------------

/** Default heartbeat interval: 60 seconds (OCPP 1.6 default). */
const DEFAULT_HEARTBEAT_INTERVAL_MS = 60_000;

/** Valid OCPP 1.6 StopTransaction reasons. */
const VALID_STOP_REASONS = new Set([
  'EmergencyStop',
  'EVDisconnected',
  'HardReset',
  'Local',
  'Other',
  'PowerLoss',
  'Reboot',
  'Remote',
  'SoftReset',
  'UnlockCommand',
  'DeAuthorized',
]);

/** Valid connector statuses per OCPP 1.6. */
const VALID_CONNECTOR_STATUSES = new Set([
  'Available',
  'Preparing',
  'Charging',
  'SuspendedEVSE',
  'SuspendedEV',
  'Finishing',
  'Reserved',
  'Unavailable',
  'Faulted',
]);

/**
 * Rule 4: TIMEOUT_NO_HEARTBEAT
 * Detects when a station sends no Heartbeat within the expected interval
 * after BootNotification. Uses 2x the default interval as the threshold.
 */
function detectTimeoutNoHeartbeat(events: Event[]): Failure[] {
  const failures: Failure[] = [];

  const bootIndex = events.findIndex(
    (e) => e.messageType === 'Call' && e.action === 'BootNotification',
  );
  if (bootIndex === -1) return failures;

  const bootEvent = events[bootIndex];
  if (!bootEvent || bootEvent.timestamp === null) return failures;

  // Extract heartbeat interval from BootNotification response if present
  let intervalMs = DEFAULT_HEARTBEAT_INTERVAL_MS;
  const bootResponse = events.find(
    (e) =>
      e.messageType === 'CallResult' &&
      e.messageId === bootEvent.messageId &&
      typeof (e.payload as { interval?: unknown })?.interval === 'number',
  );
  if (bootResponse) {
    const interval = (bootResponse.payload as { interval: number }).interval;
    intervalMs = interval * 1000;
  }

  // Look for any Heartbeat within 2x the expected interval after BootNotification
  const threshold = bootEvent.timestamp + intervalMs * 2;

  // Only flag if the trace has events beyond the heartbeat threshold
  // (if the trace ends before the first heartbeat is due, we can't know
  // if the station would have sent one)
  const hasEventsBeyondThreshold = events.some(
    (e) => e.timestamp !== null && e.timestamp > threshold,
  );

  if (!hasEventsBeyondThreshold) return failures;

  const hasHeartbeat = events.some(
    (e) =>
      e.messageType === 'Call' &&
      e.action === 'Heartbeat' &&
      e.timestamp !== null &&
      e.timestamp <= threshold,
  );

  if (!hasHeartbeat) {
    failures.push({
      code: 'TIMEOUT_NO_HEARTBEAT',
      description: `No Heartbeat received within ${(intervalMs * 2) / 1000}s of BootNotification (expected every ${intervalMs / 1000}s)`,
      severity: SEVERITY.TIMEOUT_NO_HEARTBEAT,
      eventIds: [bootEvent.id],
      suggestedSteps: SUGGESTED_STEPS.TIMEOUT_NO_HEARTBEAT,
    });
  }

  return failures;
}

/**
 * Rule 5: METER_VALUE_GAP
 * Detects active transactions (StartTransaction to StopTransaction) where
 * no MeterValuesRequest was sent.
 */
function detectMeterValueGap(_events: Event[], sessions: Session[]): Failure[] {
  const failures: Failure[] = [];

  for (const session of sessions) {
    if (session.transactionId === null) continue;

    const hasStart = session.events.some(
      (e) => e.messageType === 'Call' && e.action === 'StartTransaction',
    );
    const hasStop = session.events.some(
      (e) => e.messageType === 'Call' && e.action === 'StopTransaction',
    );

    if (!hasStart || !hasStop) continue;

    const hasMeterValues = session.events.some(
      (e) => e.messageType === 'Call' && e.action === 'MeterValues',
    );

    if (!hasMeterValues) {
      const startEvent = session.events.find(
        (e) => e.messageType === 'Call' && e.action === 'StartTransaction',
      );
      failures.push({
        code: 'METER_VALUE_GAP',
        description: `Session ${session.sessionId} (transaction ${session.transactionId}) has StartTransaction and StopTransaction but no MeterValues — metering data is missing`,
        severity: SEVERITY.METER_VALUE_GAP,
        eventIds: startEvent ? [startEvent.id] : [],
        suggestedSteps: SUGGESTED_STEPS.METER_VALUE_GAP,
      });
    }
  }

  return failures;
}

/**
 * Rule 6: INVALID_STOP_REASON
 * Detects StopTransaction with a stop reason not in the OCPP 1.6 specification.
 */
function detectInvalidStopReason(events: Event[]): Failure[] {
  const failures: Failure[] = [];

  for (const event of events) {
    if (event.messageType !== 'Call' || event.action !== 'StopTransaction') continue;

    const payload = event.payload as { reason?: unknown };
    const reason = payload?.reason;

    if (typeof reason === 'string' && !VALID_STOP_REASONS.has(reason)) {
      failures.push({
        code: 'INVALID_STOP_REASON',
        description: `StopTransaction has invalid stop reason "${reason}" — not a valid OCPP 1.6 reason code (messageId: ${event.messageId})`,
        severity: SEVERITY.INVALID_STOP_REASON,
        eventIds: [event.id],
        suggestedSteps: SUGGESTED_STEPS.INVALID_STOP_REASON,
      });
    }
  }

  return failures;
}

/**
 * Rule 7: UNEXPECTED_START
 * Detects StartTransaction without a preceding BootNotification or Authorize.
 */
function detectUnexpectedStart(events: Event[]): Failure[] {
  const failures: Failure[] = [];

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    if (!event) continue;
    if (event.messageType !== 'Call' || event.action !== 'StartTransaction') continue;

    // Check for BootNotification or Authorize before this StartTransaction
    const hasBoot = events
      .slice(0, i)
      .some((e) => e.messageType === 'Call' && e.action === 'BootNotification');
    const hasAuthorize = events
      .slice(0, i)
      .some((e) => e.messageType === 'Call' && e.action === 'Authorize');

    if (!hasBoot && !hasAuthorize) {
      failures.push({
        code: 'UNEXPECTED_START',
        description: `StartTransaction at event ${event.id} without preceding BootNotification or Authorize — transaction started without proper initialization (messageId: ${event.messageId})`,
        severity: SEVERITY.UNEXPECTED_START,
        eventIds: [event.id],
        suggestedSteps: SUGGESTED_STEPS.UNEXPECTED_START,
      });
    }
  }

  return failures;
}

/**
 * Rule 8: STATUS_TRANSITION_VIOLATION
 * Detects illegal connector status transitions.
 * Valid transitions are based on the OCPP 1.6 connector state model.
 */
const VALID_TRANSITIONS: Record<string, Set<string>> = {
  Available: new Set(['Preparing', 'Charging', 'Reserved', 'Unavailable', 'Faulted']),
  Preparing: new Set(['Charging', 'Available', 'SuspendedEVSE', 'Faulted', 'Unavailable']),
  Charging: new Set(['SuspendedEVSE', 'SuspendedEV', 'Finishing', 'Available', 'Faulted']),
  SuspendedEVSE: new Set(['Charging', 'Finishing', 'Available', 'Faulted']),
  SuspendedEV: new Set(['Charging', 'Finishing', 'Available', 'Faulted']),
  Finishing: new Set(['Available', 'Reserved', 'Faulted']),
  Reserved: new Set(['Available', 'Unavailable', 'Faulted']),
  Unavailable: new Set(['Available', 'Faulted']),
  Faulted: new Set(['Unavailable', 'Available']),
};

function detectStatusTransitionViolation(events: Event[]): Failure[] {
  const failures: Failure[] = [];

  // Collect all StatusNotification statuses in order
  const statusEvents = events.filter(
    (e) => e.messageType === 'Call' && e.action === 'StatusNotification',
  );

  let prevStatus: string | null = null;
  let prevEvent: Event | null = null;

  for (const event of statusEvents) {
    const payload = event.payload as { status?: unknown };
    const status = payload?.status;

    if (typeof status !== 'string' || !VALID_CONNECTOR_STATUSES.has(status)) continue;

    if (prevStatus !== null && prevEvent !== null) {
      const allowed: Set<string> | undefined = VALID_TRANSITIONS[prevStatus];
      if (allowed && !allowed.has(status)) {
        failures.push({
          code: 'STATUS_TRANSITION_VIOLATION',
          description: `Connector status transition from "${prevStatus}" to "${status}" is not a valid OCPP 1.6 transition (messageId: ${event.messageId})`,
          severity: SEVERITY.STATUS_TRANSITION_VIOLATION,
          eventIds: [prevEvent.id, event.id],
          suggestedSteps: SUGGESTED_STEPS.STATUS_TRANSITION_VIOLATION,
        });
      }
    }

    prevStatus = status;
    prevEvent = event;
  }

  return failures;
}

/**
 * Rule 9: DIAGNOSTICS_FAILURE
 * Detects DiagnosticsStatusNotification with a failure status.
 */
const DIAGNOSTICS_FAILURE_STATUSES = new Set([
  'Idle',
  'Uploaded',
  'UploadFailed',
  'DiagnosisFailed',
  'NotImplemented',
]);

function detectDiagnosticsFailure(events: Event[]): Failure[] {
  const failures: Failure[] = [];

  for (const event of events) {
    if (event.messageType !== 'Call' || event.action !== 'DiagnosticsStatusNotification') continue;

    const payload = event.payload as { status?: unknown };
    const status = payload?.status;

    if (typeof status === 'string' && DIAGNOSTICS_FAILURE_STATUSES.has(status)) {
      // Only report actual failures, not successful diagnostics
      if (status === 'UploadFailed' || status === 'DiagnosisFailed') {
        failures.push({
          code: 'DIAGNOSTICS_FAILURE',
          description: `DiagnosticsStatusNotification reported failure status "${status}" (messageId: ${event.messageId})`,
          severity: SEVERITY.DIAGNOSTICS_FAILURE,
          eventIds: [event.id],
          suggestedSteps: SUGGESTED_STEPS.DIAGNOSTICS_FAILURE,
        });
      }
    }
  }

  return failures;
}

/**
 * Rule 10: FIRMWARE_UPDATE_FAILURE
 * Detects FirmwareStatusNotification indicating a firmware update failure.
 */
const FIRMWARE_FAILURE_STATUSES = new Set([
  'DownloadFailed',
  'DownloadPaused',
  'InstallFailed',
  'InstallRebootingFailed',
]);

function detectFirmwareUpdateFailure(events: Event[]): Failure[] {
  const failures: Failure[] = [];

  for (const event of events) {
    if (event.messageType !== 'Call' || event.action !== 'FirmwareStatusNotification') continue;

    const payload = event.payload as { status?: unknown };
    const status = payload?.status;

    if (typeof status === 'string' && FIRMWARE_FAILURE_STATUSES.has(status)) {
      failures.push({
        code: 'FIRMWARE_UPDATE_FAILURE',
        description: `FirmwareStatusNotification reported failure status "${status}" (messageId: ${event.messageId})`,
        severity: SEVERITY.FIRMWARE_UPDATE_FAILURE,
        eventIds: [event.id],
        suggestedSteps: SUGGESTED_STEPS.FIRMWARE_UPDATE_FAILURE,
      });
    }
  }

  return failures;
}
