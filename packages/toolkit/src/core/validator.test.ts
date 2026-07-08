import { describe, it, expect } from 'vitest';
import { validateMessage, validateMessages } from './validator.js';
import type { Event, RawOcppMessage } from './types.js';

// Helpers
function makeEvent(
  id: string,
  messageId: string,
  messageType: 'Call' | 'CallResult' | 'CallError',
  action: string | null,
  payload: unknown = {},
  rawMessageOverride?: RawOcppMessage,
): Event {
  let rawMessage: RawOcppMessage;
  if (messageType === 'Call') {
    rawMessage = rawMessageOverride ?? [2, messageId, action as string, payload];
  } else if (messageType === 'CallResult') {
    rawMessage = rawMessageOverride ?? [3, messageId, payload];
  } else {
    rawMessage = rawMessageOverride ?? [4, messageId, 'Error', 'desc', payload];
  }
  return {
    id,
    messageId,
    timestamp: 1000,
    direction: 'CS_TO_CSMS',
    messageType,
    action,
    payload,
    errorCode: messageType === 'CallError' ? 'Error' : null,
    errorDescription: messageType === 'CallError' ? 'desc' : null,
    rawMessage,
  };
}

describe('validateMessage', () => {
  it('validates a correct Call message', () => {
    const event = makeEvent('evt-0001', 'msg-001', 'Call', 'BootNotification', { vendor: 'Test' });
    const result = validateMessage(event);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('validates a correct CallResult message', () => {
    const event = makeEvent('evt-0001', 'msg-001', 'CallResult', null, { status: 'Accepted' });
    const result = validateMessage(event);
    expect(result.valid).toBe(true);
  });

  it('validates a correct CallError message', () => {
    const event = makeEvent('evt-0001', 'msg-001', 'CallError', null, {});
    const result = validateMessage(event);
    expect(result.valid).toBe(true);
  });

  it('detects Call with too few elements', () => {
    const event = makeEvent('evt-0001', 'msg-001', 'Call', 'Boot', {}, [2, 'msg-001']); // only 2 elements
    const result = validateMessage(event);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('at least 4'))).toBe(true);
  });

  it('detects CallResult with too few elements', () => {
    const event = makeEvent('evt-0001', 'msg-001', 'CallResult', null, {}, [3, 'msg-001']); // only 2 elements
    const result = validateMessage(event);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('at least 3'))).toBe(true);
  });

  it('detects CallError with too few elements', () => {
    const event = makeEvent('evt-0001', 'msg-001', 'CallError', null, {}, [4, 'msg-001']); // only 2 elements
    const result = validateMessage(event);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('at least 5'))).toBe(true);
  });

  it('detects empty UniqueId', () => {
    const event = makeEvent('evt-0001', '', 'Call', 'BootNotification', {}, [
      2,
      '',
      'BootNotification',
      {},
    ]);
    const result = validateMessage(event);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('UniqueId'))).toBe(true);
  });

  it('detects messageType inconsistency', () => {
    // Event says Call but rawMessage has MessageTypeId 3
    const event = makeEvent('evt-0001', 'msg-001', 'Call', 'BootNotification', {}, [
      3,
      'msg-001',
      { status: 'Accepted' },
    ]);
    const result = validateMessage(event);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('MessageType mismatch'))).toBe(true);
  });

  it('detects Call with non-string Action', () => {
    const event = makeEvent('evt-0001', 'msg-001', 'Call', 'BootNotification', {}, [
      2,
      'msg-001',
      123,
      {},
    ]);
    const result = validateMessage(event);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Action'))).toBe(true);
  });

  it('detects CallError with non-string ErrorCode', () => {
    const event = makeEvent('evt-0001', 'msg-001', 'CallError', null, {}, [
      4,
      'msg-001',
      123,
      'desc',
      {},
    ]);
    const result = validateMessage(event);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('ErrorCode'))).toBe(true);
  });
});

describe('validateMessage with response matching', () => {
  it('detects CallResult without matching Call', () => {
    const callResult = makeEvent('evt-0001', 'msg-001', 'CallResult', null, { status: 'Accepted' });
    const result = validateMessage(callResult, [callResult]);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('no matching Call'))).toBe(true);
  });

  it('passes when CallResult has matching Call', () => {
    const call = makeEvent('evt-0001', 'msg-001', 'Call', 'BootNotification', {});
    const callResult = makeEvent('evt-0002', 'msg-001', 'CallResult', null, { status: 'Accepted' });
    const allEvents = [call, callResult];
    const result = validateMessage(callResult, allEvents);
    expect(result.valid).toBe(true);
  });
});

describe('validateMessages', () => {
  it('validates all events and returns a map', () => {
    const events = [
      makeEvent('evt-0001', 'msg-001', 'Call', 'BootNotification', {}),
      makeEvent('evt-0002', 'msg-001', 'CallResult', null, { status: 'Accepted' }),
    ];
    const results = validateMessages(events);
    expect(results.size).toBe(2);
    expect(results.get('evt-0001')?.valid).toBe(true);
    expect(results.get('evt-0002')?.valid).toBe(true);
  });

  it('returns empty map for empty events', () => {
    const results = validateMessages([]);
    expect(results.size).toBe(0);
  });
});
