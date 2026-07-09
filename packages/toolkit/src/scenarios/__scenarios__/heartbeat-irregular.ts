export default {
  name: 'heartbeat-irregular',
  description:
    'Heartbeats sent at irregular intervals — 300s expected, but 600s gap observed. Expects HEARTBEAT_INTERVAL_VIOLATION failure. Uses event_count assertion for heartbeats.',
  trace: {
    traceId: 'scenario-heartbeat-irregular',
    metadata: {
      stationId: 'CS-SYNTHETIC-014',
      ocppVersion: '1.6',
      source: 'synthetic-scenario',
      description: 'Heartbeats sent at irregular intervals — 300s expected, 600s gap observed.',
    },
    events: [
      {
        timestamp: '2024-01-15T12:00:00.000Z',
        direction: 'CS_TO_CSMS',
        message: [
          2,
          'msg-001',
          'BootNotification',
          {
            chargePointVendor: 'SyntheticVendor',
            chargePointModel: 'SM-100',
            chargePointSerialNumber: 'CS-SYNTHETIC-014',
            firmwareVersion: '1.0.0',
          },
        ],
      },
      {
        timestamp: '2024-01-15T12:00:00.500Z',
        direction: 'CSMS_TO_CS',
        message: [
          3,
          'msg-001',
          {
            currentTime: '2024-01-15T12:00:00.500Z',
            interval: 300,
            status: 'Accepted',
          },
        ],
      },
      {
        timestamp: '2024-01-15T12:05:00.000Z',
        direction: 'CS_TO_CSMS',
        message: [2, 'msg-hb-1', 'Heartbeat', {}],
      },
      {
        timestamp: '2024-01-15T12:05:00.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-hb-1', { currentTime: '2024-01-15T12:05:00.500Z' }],
      },
      {
        timestamp: '2024-01-15T12:15:00.000Z',
        direction: 'CS_TO_CSMS',
        message: [2, 'msg-hb-2', 'Heartbeat', {}],
      },
      {
        timestamp: '2024-01-15T12:15:00.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-hb-2', { currentTime: '2024-01-15T12:15:00.500Z' }],
      },
      {
        timestamp: '2024-01-15T12:25:00.000Z',
        direction: 'CS_TO_CSMS',
        message: [2, 'msg-hb-3', 'Heartbeat', {}],
      },
      {
        timestamp: '2024-01-15T12:25:00.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-hb-3', { currentTime: '2024-01-15T12:25:00.500Z' }],
      },
    ],
  },
  expectedFailures: ['HEARTBEAT_INTERVAL_VIOLATION'],
  assertions: [
    {
      type: 'event_count',
      params: { min: 3, action: 'Heartbeat' },
    },
  ],
};
