/**
 * Synthetic trace fixtures for testing and development.
 *
 * All fixtures are fully synthetic — no real station identifiers, transaction
 * IDs, idTag values, or personal data.
 *
 * @see docs/trace-format-spec.md
 */

import normalSession from '../__fixtures__/normal-session.json';
import failedAuth from '../__fixtures__/failed-auth.json';
import connectorFault from '../__fixtures__/connector-fault.json';

export { normalSession, failedAuth, connectorFault };

export const fixtures = {
  normalSession,
  failedAuth,
  connectorFault,
} as const;

export const fixtureNames = ['normal-session', 'failed-auth', 'connector-fault'] as const;
