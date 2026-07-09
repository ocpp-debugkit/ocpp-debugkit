/**
 * Failure detection — analyzes events and sessions for known failure patterns.
 *
 * 16 detection rules (v0.1 + v0.2 + v0.3):
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
 * v0.3:
 * 11. SUSPICIOUS_SESSION_DURATION — session < 60s or > 24h
 * 12. SLOW_RESPONSE — gap between Call and matching CallResult/CallError > 10s
 * 13. HEARTBEAT_INTERVAL_VIOLATION — heartbeat intervals deviate >50% from expected
 * 14. METER_VALUE_ANOMALY — non-monotonic or negative meter readings
 * 15. UNRESPONSIVE_CSMS — Call with no matching CallResult or CallError
 * 16. REPEATED_BOOT_NOTIFICATION — 2+ BootNotification calls within 5 minutes
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
  SUSPICIOUS_SESSION_DURATION: [
    'Review the session duration in the trace timeline',
    'For very short sessions: check if the transaction was aborted or authorization failed mid-session',
    'For very long sessions: check if the station forgot to send StopTransaction',
    'Verify the station clock is synchronized (NTP)',
    'Check if the session spans a maintenance window or firmware update',
  ],
  SLOW_RESPONSE: [
    'Check the CSMS processing time for the affected message type',
    'Review system load and database performance on the CSMS',
    'Verify network latency between station and CSMS',
    'Check if the CSMS is running a long-running synchronous operation',
    'Review CSMS logs for the specific message ID',
  ],
  HEARTBEAT_INTERVAL_VIOLATION: [
    'Verify the heartbeat interval configured on the station matches the BootNotification response',
    'Check for network instability causing delayed heartbeats',
    'Review the station clock synchronization (NTP)',
    'Check if the station firmware has a known heartbeat timing bug',
    'Inspect the WebSocket connection stability',
  ],
  METER_VALUE_ANOMALY: [
    'Verify the meter is functioning correctly and is properly calibrated',
    'Check for meter communication errors or data corruption',
    'Review the meter value sampling and reporting configuration',
    'Inspect for potential tampering or hardware malfunction',
    'Contact the meter vendor if the issue persists',
  ],
  UNRESPONSIVE_CSMS: [
    'Check if the CSMS was online and accepting connections during the session',
    'Verify the WebSocket connection was stable at the time of the unanswered Call',
    'Review CSMS logs for the specific message ID',
    'Check if the CSMS crashed or restarted during the session',
    'Inspect the network path between station and CSMS for packet loss',
  ],
  REPEATED_BOOT_NOTIFICATION: [
    'Check whether the station rebooted unexpectedly',
    'Review station power and network stability during the boot window',
    'Inspect station firmware logs for watchdog resets or startup failures',
    'Verify the CSMS accepts the BootNotification and returns a valid interval',
    'Contact the station vendor if repeated boots persist',
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
  SUSPICIOUS_SESSION_DURATION: 'warning',
  SLOW_RESPONSE: 'warning',
  HEARTBEAT_INTERVAL_VIOLATION: 'info',
  METER_VALUE_ANOMALY: 'warning',
  UNRESPONSIVE_CSMS: 'critical',
  REPEATED_BOOT_NOTIFICATION: 'warning',
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

  // v0.3 rules
  failures.push(...detectSuspiciousSessionDuration(events, sessions));
  failures.push(...detectSlowResponse(events));
  failures.push(...detectHeartbeatIntervalViolation(events));
  failures.push(...detectMeterValueAnomaly(events, sessions));
  failures.push(...detectUnresponsiveCsms(events));
  failures.push(...detectRepeatedBootNotification(events));

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

// ---------------------------------------------------------------------------
// v0.3 detection rules
// ---------------------------------------------------------------------------

/** Minimum session duration to not be suspicious: 60 seconds. */
const MIN_SESSION_DURATION_MS = 60_000;

/** Maximum session duration to not be suspicious: 24 hours. */
const MAX_SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

/** Threshold for slow response: 10 seconds. */
const SLOW_RESPONSE_THRESHOLD_MS = 10_000;

/** Deviation threshold for heartbeat interval violation: 50%. */
const HEARTBEAT_DEVIATION_THRESHOLD = 0.5;

/** Time window for repeated BootNotification calls: 5 minutes. */
const REPEATED_BOOT_NOTIFICATION_WINDOW_MS = 5 * 60 * 1000;

/**
 * Rule 11: SUSPICIOUS_SESSION_DURATION
 * Detects sessions that are suspiciously short (< 60s) or long (> 24h).
 */
function detectSuspiciousSessionDuration(_events: Event[], sessions: Session[]): Failure[] {
  const failures: Failure[] = [];

  for (const session of sessions) {
    if (session.transactionId === null) continue;
    if (session.startTime === null || session.endTime === null) continue;

    const durationMs = session.endTime - session.startTime;

    if (durationMs < MIN_SESSION_DURATION_MS) {
      failures.push({
        code: 'SUSPICIOUS_SESSION_DURATION',
        description: `Session ${session.sessionId} (transaction ${session.transactionId}) lasted only ${durationMs}ms — suspiciously short session may indicate aborted start or authorization failure`,
        severity: SEVERITY.SUSPICIOUS_SESSION_DURATION,
        eventIds: session.events
          .filter(
            (e) =>
              e.messageType === 'Call' &&
              (e.action === 'StartTransaction' || e.action === 'StopTransaction'),
          )
          .map((e) => e.id),
        suggestedSteps: SUGGESTED_STEPS.SUSPICIOUS_SESSION_DURATION,
      });
    } else if (durationMs > MAX_SESSION_DURATION_MS) {
      failures.push({
        code: 'SUSPICIOUS_SESSION_DURATION',
        description: `Session ${session.sessionId} (transaction ${session.transactionId}) lasted ${Math.round(durationMs / (60 * 60 * 1000))} hours — suspiciously long session may indicate forgotten charging or missing StopTransaction`,
        severity: SEVERITY.SUSPICIOUS_SESSION_DURATION,
        eventIds: session.events
          .filter(
            (e) =>
              e.messageType === 'Call' &&
              (e.action === 'StartTransaction' || e.action === 'StopTransaction'),
          )
          .map((e) => e.id),
        suggestedSteps: SUGGESTED_STEPS.SUSPICIOUS_SESSION_DURATION,
      });
    }
  }

  return failures;
}

/**
 * Rule 12: SLOW_RESPONSE
 * Detects when the gap between a Call and its matching CallResult/CallError
 * exceeds the threshold (default 10s).
 */
function detectSlowResponse(events: Event[]): Failure[] {
  const failures: Failure[] = [];

  // Build a map of messageId → CallResult/CallError timestamps
  const responseMap = new Map<string, number>();
  for (const event of events) {
    if (
      (event.messageType === 'CallResult' || event.messageType === 'CallError') &&
      event.timestamp !== null
    ) {
      responseMap.set(event.messageId, event.timestamp);
    }
  }

  for (const call of events) {
    if (call.messageType !== 'Call' || call.timestamp === null) continue;

    const responseTime = responseMap.get(call.messageId);
    if (responseTime === undefined) continue; // No matching response — handled by UNRESPONSIVE_CSMS

    const gapMs = responseTime - call.timestamp;
    if (gapMs > SLOW_RESPONSE_THRESHOLD_MS) {
      failures.push({
        code: 'SLOW_RESPONSE',
        description: `Response to ${call.action} (messageId: ${call.messageId}) took ${Math.round(gapMs / 1000)}s — exceeds ${SLOW_RESPONSE_THRESHOLD_MS / 1000}s threshold`,
        severity: SEVERITY.SLOW_RESPONSE,
        eventIds: [call.id],
        suggestedSteps: SUGGESTED_STEPS.SLOW_RESPONSE,
      });
    }
  }

  return failures;
}

/**
 * Rule 13: HEARTBEAT_INTERVAL_VIOLATION
 * Detects when heartbeat intervals deviate >50% from the expected interval
 * (from BootNotification response, or default 60s).
 */
function detectHeartbeatIntervalViolation(events: Event[]): Failure[] {
  const failures: Failure[] = [];

  // Extract expected heartbeat interval from BootNotification response
  let expectedIntervalMs = DEFAULT_HEARTBEAT_INTERVAL_MS;
  const bootIndex = events.findIndex(
    (e) => e.messageType === 'Call' && e.action === 'BootNotification',
  );
  if (bootIndex !== -1) {
    const bootEvent = events[bootIndex];
    if (bootEvent) {
      const bootResponse = events.find(
        (e) =>
          e.messageType === 'CallResult' &&
          e.messageId === bootEvent.messageId &&
          typeof (e.payload as { interval?: unknown })?.interval === 'number',
      );
      if (bootResponse) {
        const interval = (bootResponse.payload as { interval: number }).interval;
        expectedIntervalMs = interval * 1000;
      }
    }
  }

  // Collect heartbeat timestamps in order
  const heartbeatTimestamps = events
    .filter((e) => e.messageType === 'Call' && e.action === 'Heartbeat' && e.timestamp !== null)
    .map((e) => ({ id: e.id, timestamp: e.timestamp as number }));

  if (heartbeatTimestamps.length < 2) return failures;

  for (let i = 1; i < heartbeatTimestamps.length; i++) {
    const prev = heartbeatTimestamps[i - 1];
    const curr = heartbeatTimestamps[i];
    if (!prev || !curr) continue;

    const actualGap = curr.timestamp - prev.timestamp;
    const deviation = Math.abs(actualGap - expectedIntervalMs) / expectedIntervalMs;

    if (deviation > HEARTBEAT_DEVIATION_THRESHOLD) {
      failures.push({
        code: 'HEARTBEAT_INTERVAL_VIOLATION',
        description: `Heartbeat interval deviation: ${Math.round(actualGap / 1000)}s between heartbeats, expected ~${Math.round(expectedIntervalMs / 1000)}s (${Math.round(deviation * 100)}% deviation)`,
        severity: SEVERITY.HEARTBEAT_INTERVAL_VIOLATION,
        eventIds: [prev.id, curr.id],
        suggestedSteps: SUGGESTED_STEPS.HEARTBEAT_INTERVAL_VIOLATION,
      });
    }
  }

  return failures;
}

/**
 * Rule 14: METER_VALUE_ANOMALY
 * Detects non-monotonic (decreasing) or negative meter readings during
 * an active transaction.
 */
function detectMeterValueAnomaly(_events: Event[], sessions: Session[]): Failure[] {
  const failures: Failure[] = [];

  for (const session of sessions) {
    if (session.transactionId === null) continue;

    // Collect meter values from MeterValues calls in order
    const meterEvents = session.events.filter(
      (e) => e.messageType === 'Call' && e.action === 'MeterValues',
    );

    if (meterEvents.length === 0) continue;

    // Extract numeric meter values from the payload
    // OCPP 1.6 MeterValues: { connectorId, transactionId, meterValue: [{ timestamp, sampledValue: [{ value, ... }] }] }
    const readings: { eventId: string; value: number }[] = [];

    for (const event of meterEvents) {
      const payload = event.payload as {
        meterValue?: {
          sampledValue?: { value?: unknown }[];
        }[];
      };

      const meterValues = payload?.meterValue;
      if (!Array.isArray(meterValues)) continue;

      for (const mv of meterValues) {
        const sampledValues = mv?.sampledValue;
        if (!Array.isArray(sampledValues)) continue;

        for (const sv of sampledValues) {
          const rawValue = sv?.value;
          if (typeof rawValue === 'string') {
            const numValue = Number.parseFloat(rawValue);
            if (!Number.isNaN(numValue)) {
              readings.push({ eventId: event.id, value: numValue });
            }
          } else if (typeof rawValue === 'number') {
            readings.push({ eventId: event.id, value: rawValue });
          }
        }
      }
    }

    if (readings.length === 0) continue;

    // Check for negative values
    for (const reading of readings) {
      if (reading.value < 0) {
        failures.push({
          code: 'METER_VALUE_ANOMALY',
          description: `Negative meter value detected: ${reading.value} in session ${session.sessionId} (transaction ${session.transactionId})`,
          severity: SEVERITY.METER_VALUE_ANOMALY,
          eventIds: [reading.eventId],
          suggestedSteps: SUGGESTED_STEPS.METER_VALUE_ANOMALY,
        });
      }
    }

    // Check for non-monotonic (decreasing) values
    for (let i = 1; i < readings.length; i++) {
      const prev = readings[i - 1];
      const curr = readings[i];
      if (!prev || !curr) continue;

      if (curr.value < prev.value) {
        failures.push({
          code: 'METER_VALUE_ANOMALY',
          description: `Non-monotonic meter reading: value decreased from ${prev.value} to ${curr.value} in session ${session.sessionId} (transaction ${session.transactionId})`,
          severity: SEVERITY.METER_VALUE_ANOMALY,
          eventIds: [prev.eventId, curr.eventId],
          suggestedSteps: SUGGESTED_STEPS.METER_VALUE_ANOMALY,
        });
      }
    }
  }

  return failures;
}

/**
 * Rule 15: UNRESPONSIVE_CSMS
 * Detects Call messages that have no matching CallResult or CallError
 * (the CSMS never responded).
 */
function detectUnresponsiveCsms(events: Event[]): Failure[] {
  const failures: Failure[] = [];

  // Build a set of messageIds that have responses
  const respondedMessageIds = new Set<string>();
  for (const event of events) {
    if (event.messageType === 'CallResult' || event.messageType === 'CallError') {
      respondedMessageIds.add(event.messageId);
    }
  }

  for (const call of events) {
    if (call.messageType !== 'Call') continue;

    if (!respondedMessageIds.has(call.messageId)) {
      failures.push({
        code: 'UNRESPONSIVE_CSMS',
        description: `No response received for ${call.action} Call (messageId: ${call.messageId}) — CSMS did not respond with CallResult or CallError`,
        severity: SEVERITY.UNRESPONSIVE_CSMS,
        eventIds: [call.id],
        suggestedSteps: SUGGESTED_STEPS.UNRESPONSIVE_CSMS,
      });
    }
  }

  return failures;
}

/**
 * Rule 16: REPEATED_BOOT_NOTIFICATION
 * Detects when a station sends 2+ BootNotification Calls within 5 minutes.
 */
function detectRepeatedBootNotification(events: Event[]): Failure[] {
  const failures: Failure[] = [];

  const bootEvents = events
    .filter(
      (event) =>
        event.messageType === 'Call' &&
        event.action === 'BootNotification' &&
        event.timestamp !== null,
    )
    .sort((a, b) => (a.timestamp as number) - (b.timestamp as number));

  for (let i = 0; i < bootEvents.length; i++) {
    const firstBoot = bootEvents[i];
    if (!firstBoot || firstBoot.timestamp === null) continue;

    const repeatedBoots = [firstBoot];
    let j = i + 1;

    while (j < bootEvents.length) {
      const nextBoot = bootEvents[j];
      if (!nextBoot || nextBoot.timestamp === null) {
        j++;
        continue;
      }

      if (nextBoot.timestamp - firstBoot.timestamp > REPEATED_BOOT_NOTIFICATION_WINDOW_MS) {
        break;
      }

      repeatedBoots.push(nextBoot);
      j++;
    }

    if (repeatedBoots.length >= 2) {
      const windowSeconds = Math.round(
        ((repeatedBoots[repeatedBoots.length - 1]?.timestamp ?? firstBoot.timestamp) -
          firstBoot.timestamp) /
          1000,
      );

      failures.push({
        code: 'REPEATED_BOOT_NOTIFICATION',
        description: `${repeatedBoots.length} BootNotification calls detected within ${windowSeconds}s — station may be rebooting repeatedly or failing startup`,
        severity: SEVERITY.REPEATED_BOOT_NOTIFICATION,
        eventIds: repeatedBoots.map((event) => event.id),
        suggestedSteps: SUGGESTED_STEPS.REPEATED_BOOT_NOTIFICATION,
      });

      i = j - 1;
    }
  }

  return failures;
}
