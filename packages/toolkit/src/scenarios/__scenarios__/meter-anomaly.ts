export default {
  name: 'meter-anomaly',
  description:
    'Meter values decrease during an active transaction (non-monotonic). Expects METER_VALUE_ANOMALY failure. Uses payload_field assertion to verify meter values.',
  trace: {
    traceId: 'scenario-meter-anomaly',
    metadata: {
      stationId: 'CS-SYNTHETIC-012',
      ocppVersion: '1.6',
      source: 'synthetic-scenario',
      description:
        'Meter reading decreases from 5000 to 3000 during charging — non-monotonic anomaly.',
    },
    events: [
      {
        timestamp: '2024-01-15T14:00:00.000Z',
        direction: 'CS_TO_CSMS',
        message: [
          2,
          'msg-001',
          'BootNotification',
          {
            chargePointVendor: 'SyntheticVendor',
            chargePointModel: 'SM-100',
            chargePointSerialNumber: 'CS-SYNTHETIC-012',
            firmwareVersion: '1.0.0',
          },
        ],
      },
      {
        timestamp: '2024-01-15T14:00:00.500Z',
        direction: 'CSMS_TO_CS',
        message: [
          3,
          'msg-001',
          {
            currentTime: '2024-01-15T14:00:00.500Z',
            interval: 300,
            status: 'Accepted',
          },
        ],
      },
      {
        timestamp: '2024-01-15T14:01:00.000Z',
        direction: 'CS_TO_CSMS',
        message: [2, 'msg-002', 'Authorize', { idTag: 'SYNTHETIC-TAG-012' }],
      },
      {
        timestamp: '2024-01-15T14:01:00.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-002', { idTagInfo: { status: 'Accepted' } }],
      },
      {
        timestamp: '2024-01-15T14:02:00.000Z',
        direction: 'CS_TO_CSMS',
        message: [
          2,
          'msg-003',
          'StartTransaction',
          { connectorId: 1, idTag: 'SYNTHETIC-TAG-012', meterStart: 0 },
        ],
      },
      {
        timestamp: '2024-01-15T14:02:00.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-003', { idTagInfo: { status: 'Accepted' }, transactionId: 100012 }],
      },
      {
        timestamp: '2024-01-15T14:05:00.000Z',
        direction: 'CS_TO_CSMS',
        message: [
          2,
          'msg-004',
          'MeterValues',
          {
            connectorId: 1,
            transactionId: 100012,
            meterValue: [{ sampledValue: [{ value: '5000' }] }],
          },
        ],
      },
      {
        timestamp: '2024-01-15T14:05:00.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-004', {}],
      },
      {
        timestamp: '2024-01-15T14:06:00.000Z',
        direction: 'CS_TO_CSMS',
        message: [
          2,
          'msg-005',
          'MeterValues',
          {
            connectorId: 1,
            transactionId: 100012,
            meterValue: [{ sampledValue: [{ value: '3000' }] }],
          },
        ],
      },
      {
        timestamp: '2024-01-15T14:06:00.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-005', {}],
      },
      {
        timestamp: '2024-01-15T14:10:00.000Z',
        direction: 'CS_TO_CSMS',
        message: [2, 'msg-006', 'Heartbeat', {}],
      },
      {
        timestamp: '2024-01-15T14:10:00.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-006', { currentTime: '2024-01-15T14:10:00.500Z' }],
      },
      {
        timestamp: '2024-01-15T14:30:00.000Z',
        direction: 'CS_TO_CSMS',
        message: [
          2,
          'msg-007',
          'StopTransaction',
          {
            transactionId: 100012,
            idTag: 'SYNTHETIC-TAG-012',
            meterStop: 3000,
            reason: 'EVDisconnected',
          },
        ],
      },
      {
        timestamp: '2024-01-15T14:30:00.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-007', { idTagInfo: { status: 'Accepted' } }],
      },
    ],
  },
  expectedFailures: ['METER_VALUE_ANOMALY'],
  assertions: [
    {
      type: 'payload_field',
      params: {
        action: 'StartTransaction',
        field: 'connectorId',
        equals: 1,
      },
    },
    {
      type: 'event_count',
      params: { min: 2, max: 2, action: 'MeterValues' },
    },
  ],
};
