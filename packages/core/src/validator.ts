/**
 * OCPP message validator — checks structural compliance of individual messages.
 *
 * Validates that an OCPP 1.6 JSON message conforms to the protocol's
 * structural requirements.
 *
 * @see docs/trace-format-spec.md
 */

import type { Event, MessageType, ValidationResult } from './types.js';

// ---------------------------------------------------------------------------
// Validation rules
// ---------------------------------------------------------------------------

/**
 * Validate the message structure based on its type.
 *
 * Call (2):        [2, UniqueId, Action, Payload] — 4+ elements, Action is string
 * CallResult (3):  [3, UniqueId, Payload] — 3+ elements
 * CallError (4):   [4, UniqueId, ErrorCode, ErrorDescription, ErrorDetails] — 5+ elements
 */
function validateMessageStructure(event: Event): string[] {
  const errors: string[] = [];
  const msg = event.rawMessage;
  const msgType = event.messageType;

  // Check minimum length
  const minLength = msgType === 'Call' ? 4 : msgType === 'CallResult' ? 3 : 5;
  if (msg.length < minLength) {
    errors.push(`${msgType} message must have at least ${minLength} elements (has ${msg.length})`);
  }

  // Check MessageTypeId (index 0)
  if (msg[0] !== 2 && msg[0] !== 3 && msg[0] !== 4) {
    errors.push(`Invalid MessageTypeId: ${msg[0]} (expected 2, 3, or 4)`);
  }

  // Check UniqueId (index 1)
  if (typeof msg[1] !== 'string' || msg[1] === '') {
    errors.push('UniqueId (index 1) must be a non-empty string');
  }

  // Call-specific: Action (index 2) must be a string
  if (msgType === 'Call') {
    if (typeof msg[2] !== 'string' || msg[2] === '') {
      errors.push('Call Action (index 2) must be a non-empty string');
    }
  }

  // CallError-specific: ErrorCode and ErrorDescription
  if (msgType === 'CallError') {
    if (typeof msg[2] !== 'string' || msg[2] === '') {
      errors.push('CallError ErrorCode (index 2) must be a non-empty string');
    }
    if (typeof msg[3] !== 'string') {
      errors.push('CallError ErrorDescription (index 3) must be a string');
    }
  }

  return errors;
}

/**
 * Validate that the event's messageType matches the raw message's MessageTypeId.
 */
function validateTypeConsistency(event: Event): string[] {
  const errors: string[] = [];
  const expectedType: MessageType =
    event.rawMessage[0] === 2 ? 'Call' : event.rawMessage[0] === 3 ? 'CallResult' : 'CallError';

  if (event.messageType !== expectedType) {
    errors.push(
      `MessageType mismatch: event says "${event.messageType}" but raw message has MessageTypeId ${event.rawMessage[0]} ("${expectedType}")`,
    );
  }

  return errors;
}

/**
 * Validate that CallResult/CallError have a matching Call.
 * This is a soft validation — the function checks if there's a Call with
 * the same messageId in the provided event list.
 */
function validateResponseHasCall(event: Event, allEvents: Event[]): string[] {
  const errors: string[] = [];

  if (event.messageType === 'CallResult' || event.messageType === 'CallError') {
    const hasCall = allEvents.some(
      (e) => e.messageType === 'Call' && e.messageId === event.messageId,
    );
    if (!hasCall) {
      errors.push(`${event.messageType} with messageId "${event.messageId}" has no matching Call`);
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// validateMessage()
// ---------------------------------------------------------------------------

/**
 * Validate a single OCPP message for structural compliance.
 *
 * Checks:
 * - Message array has correct minimum length for its type
 * - MessageTypeId is 2, 3, or 4
 * - UniqueId is a non-empty string
 * - Call messages have a string Action
 * - CallError messages have ErrorCode and ErrorDescription
 * - MessageType field is consistent with raw message's MessageTypeId
 *
 * @param event - The event to validate
 * @param allEvents - Optional: all events in the trace (for Call/Response matching)
 * @returns Validation result with errors array
 */
export function validateMessage(event: Event, allEvents?: Event[]): ValidationResult {
  const errors: string[] = [];

  errors.push(...validateMessageStructure(event));
  errors.push(...validateTypeConsistency(event));

  if (allEvents) {
    errors.push(...validateResponseHasCall(event, allEvents));
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate all events in a trace.
 *
 * @param events - All events in the trace
 * @returns Map of event ID to validation result
 */
export function validateMessages(events: Event[]): Map<string, ValidationResult> {
  const results = new Map<string, ValidationResult>();

  for (const event of events) {
    results.set(event.id, validateMessage(event, events));
  }

  return results;
}
