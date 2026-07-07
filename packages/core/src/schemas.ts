/**
 * Zod schemas for OCPP DebugKit trace input validation.
 *
 * These schemas validate untrusted input at the boundary (ADR-0007).
 * They prevent prototype pollution and ensure structural correctness
 * before any processing occurs.
 *
 * @see docs/trace-format-spec.md
 * @see ADR-0002 (input trace formats)
 * @see ADR-0003 (canonical event model)
 * @see ADR-0007 (malformed trace handling)
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export const directionSchema = z.enum(['CS_TO_CSMS', 'CSMS_TO_CS', 'UNKNOWN']);

export const messageTypeSchema = z.enum(['Call', 'CallResult', 'CallError']);

/**
 * Raw OCPP 1.6 JSON message array.
 * - Call (2):        [2, UniqueId, Action, Payload]
 * - CallResult (3):  [3, UniqueId, Payload]
 * - CallError (4):   [4, UniqueId, ErrorCode, ErrorDescription, ErrorDetails]
 *
 * We validate the first two elements strictly (MessageTypeId + UniqueId)
 * and accept arbitrary payload data.
 */
export const rawOcppMessageSchema = z
  .tuple([z.number(), z.string()])
  .rest(z.unknown())
  .refine((msg) => msg[0] === 2 || msg[0] === 3 || msg[0] === 4, {
    message: 'MessageTypeId must be 2 (Call), 3 (CallResult), or 4 (CallError)',
  })
  .refine((msg) => (msg[0] === 2 ? msg.length >= 4 : true), {
    message: 'Call message must have at least 4 elements: [2, UniqueId, Action, Payload]',
  })
  .refine((msg) => (msg[0] === 3 ? msg.length >= 3 : true), {
    message: 'CallResult message must have at least 3 elements: [3, UniqueId, Payload]',
  })
  .refine((msg) => (msg[0] === 4 ? msg.length >= 5 : true), {
    message:
      'CallError message must have at least 5 elements: [4, UniqueId, ErrorCode, ErrorDescription, ErrorDetails]',
  })
  .refine((msg) => (msg[0] === 2 ? typeof msg[2] === 'string' : true), {
    message: 'Call message Action (index 2) must be a string',
  })
  .refine((msg) => (msg[0] === 4 ? typeof msg[2] === 'string' : true), {
    message: 'CallError ErrorCode (index 2) must be a string',
  })
  .refine((msg) => (msg[0] === 4 ? typeof msg[3] === 'string' : true), {
    message: 'CallError ErrorDescription (index 3) must be a string',
  });

// ---------------------------------------------------------------------------
// Trace Event Input (ADR-0002, ADR-0003)
// ---------------------------------------------------------------------------

export const traceEventInputSchema = z.object({
  timestamp: z.union([z.string(), z.number()]).nullable().optional(),
  direction: directionSchema.optional(),
  message: rawOcppMessageSchema,
});

// ---------------------------------------------------------------------------
// Trace Metadata (ADR-0002)
// ---------------------------------------------------------------------------

export const traceMetadataSchema = z.object({
  stationId: z.string().optional(),
  ocppVersion: z.string().optional(),
  source: z.string().optional(),
  description: z.string().optional(),
});

// ---------------------------------------------------------------------------
// JSON Object Trace Format (ADR-0002)
// ---------------------------------------------------------------------------

export const traceSchema = z.object({
  traceId: z.string().optional(),
  metadata: traceMetadataSchema.optional(),
  events: z.array(traceEventInputSchema).min(1, { message: 'events array must not be empty' }),
});

// ---------------------------------------------------------------------------
// Bare Array Format (degenerate — array of raw OCPP messages)
// ---------------------------------------------------------------------------

export const bareArraySchema = z.array(rawOcppMessageSchema).min(1);
