export default {
  name: 'slow-csms-response',
  description:
    'CSMS takes 15 seconds to respond to a BootNotification Call. Expects SLOW_RESPONSE failure. Uses timing assertion to verify response gap.',
  trace: {
    traceId: 'scenario-slow-csms-response',
    metadata: {
      stationId: 'CS-SYNTHETIC-011',
      ocppVersion: '1.6',
      source: 'synthetic-scenario',
      description: 'CSMS responds slowly to BootNotification — 15s response gap.',
    },
    events: [
      {
        timestamp: '2024-01-15T06:00:00.000Z',
        direction: 'CS_TO_CSMS',
        message: [
          2,
          'msg-001',
          'BootNotification',
          {
            chargePointVendor: 'SyntheticVendor',
            chargePointModel: 'SM-100',
            chargePointSerialNumber: 'CS-SYNTHETIC-011',
            firmwareVersion: '1.0.0',
          },
        ],
      },
      {
        timestamp: '2024-01-15T06:00:15.000Z',
        direction: 'CSMS_TO_CS',
        message: [
          3,
          'msg-001',
          {
            currentTime: '2024-01-15T06:00:15.000Z',
            interval: 300,
            status: 'Accepted',
          },
        ],
      },
      {
        timestamp: '2024-01-15T06:00:16.000Z',
        direction: 'CS_TO_CSMS',
        message: [2, 'msg-002', 'Heartbeat', {}],
      },
      {
        timestamp: '2024-01-15T06:00:16.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-002', { currentTime: '2024-01-15T06:00:16.500Z' }],
      },
    ],
  },
  expectedFailures: ['SLOW_RESPONSE'],
  assertions: [
    {
      type: 'timing',
      params: { actionA: 'BootNotification', actionB: 'Heartbeat', maxGapMs: 5000 },
    },
  ],
};
