export default {
  name: 'short-session',
  description:
    'Session lasts only 10 seconds — suspiciously short. Expects SUSPICIOUS_SESSION_DURATION failure. Uses session_state and event_count assertions.',
  trace: {
    traceId: 'scenario-short-session',
    metadata: {
      stationId: 'CS-SYNTHETIC-013',
      ocppVersion: '1.6',
      source: 'synthetic-scenario',
      description: 'Transaction starts and stops within 10 seconds — suspiciously short.',
    },
    events: [
      {
        timestamp: '2024-01-15T09:00:00.000Z',
        direction: 'CS_TO_CSMS',
        message: [
          2,
          'msg-001',
          'BootNotification',
          {
            chargePointVendor: 'SyntheticVendor',
            chargePointModel: 'SM-100',
            chargePointSerialNumber: 'CS-SYNTHETIC-013',
            firmwareVersion: '1.0.0',
          },
        ],
      },
      {
        timestamp: '2024-01-15T09:00:00.500Z',
        direction: 'CSMS_TO_CS',
        message: [
          3,
          'msg-001',
          {
            currentTime: '2024-01-15T09:00:00.500Z',
            interval: 300,
            status: 'Accepted',
          },
        ],
      },
      {
        timestamp: '2024-01-15T09:00:01.000Z',
        direction: 'CS_TO_CSMS',
        message: [2, 'msg-002', 'Authorize', { idTag: 'SYNTHETIC-TAG-013' }],
      },
      {
        timestamp: '2024-01-15T09:00:01.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-002', { idTagInfo: { status: 'Accepted' } }],
      },
      {
        timestamp: '2024-01-15T09:00:02.000Z',
        direction: 'CS_TO_CSMS',
        message: [
          2,
          'msg-003',
          'StartTransaction',
          { connectorId: 1, idTag: 'SYNTHETIC-TAG-013', meterStart: 0 },
        ],
      },
      {
        timestamp: '2024-01-15T09:00:02.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-003', { idTagInfo: { status: 'Accepted' }, transactionId: 100013 }],
      },
      {
        timestamp: '2024-01-15T09:00:03.000Z',
        direction: 'CS_TO_CSMS',
        message: [
          2,
          'msg-004',
          'MeterValues',
          {
            connectorId: 1,
            transactionId: 100013,
            meterValue: [{ sampledValue: [{ value: '100' }] }],
          },
        ],
      },
      {
        timestamp: '2024-01-15T09:00:03.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-004', {}],
      },
      {
        timestamp: '2024-01-15T09:00:04.000Z',
        direction: 'CS_TO_CSMS',
        message: [2, 'msg-005', 'Heartbeat', {}],
      },
      {
        timestamp: '2024-01-15T09:00:04.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-005', { currentTime: '2024-01-15T09:00:04.500Z' }],
      },
      {
        timestamp: '2024-01-15T09:00:10.000Z',
        direction: 'CS_TO_CSMS',
        message: [
          2,
          'msg-006',
          'StopTransaction',
          {
            transactionId: 100013,
            idTag: 'SYNTHETIC-TAG-013',
            meterStop: 100,
            reason: 'EVDisconnected',
          },
        ],
      },
      {
        timestamp: '2024-01-15T09:00:10.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-006', { idTagInfo: { status: 'Accepted' } }],
      },
    ],
  },
  expectedFailures: ['SUSPICIOUS_SESSION_DURATION'],
  assertions: [
    {
      type: 'session_state',
      params: { expected: 'completed' },
    },
    {
      type: 'event_count',
      params: { min: 1, action: 'StartTransaction' },
    },
  ],
};
