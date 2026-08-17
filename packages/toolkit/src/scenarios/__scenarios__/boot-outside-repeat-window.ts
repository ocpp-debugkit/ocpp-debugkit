export default {
  name: 'boot-outside-repeat-window',
  description:
    'Two BootNotifications triggered outside the configured repeat window, expecting no failures.',
  trace: {
    traceId: 'scenario-boot-outside-repeat-window',
    metadata: {
      stationId: 'CS-SYNTHETIC-023',
      ocppVersion: '1.6',
      source: 'synthetic-scenario',
      description:
        '2 BootNotifications 300+ seconds apart should not trigger failure',
    },
    events: [
      {
        timestamp: '2026-02-01T11:00:00.000Z',
        direction: 'CS_TO_CSMS',
        message: [
          2,
          'msg-001',
          'BootNotification',
          {
            chargePointVendor: 'SyntheticVendor',
            chargePointModel: 'SM-100',
            chargePointSerialNumber: 'CS-SYNTHETIC-023',
            firmwareVersion: '1.0.0',
          },
        ],
      },
      {
        timestamp: '2026-02-01T11:00:00.500Z',
        direction: 'CSMS_TO_CS',
        message: [
          3,
          'msg-001',
          {
            currentTime: '2026-02-01T11:00:00.500Z',
            interval: 300,
            status: 'Accepted',
          },
        ],
      },
      {
        timestamp: '2026-02-01T11:03:00.000Z',
        direction: 'CS_TO_CSMS',
        message: [2, 'msg-hb-1', 'Heartbeat', {}],
      },
      {
        timestamp: '2026-02-01T11:03:00.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-hb-1', { currentTime: '2026-02-01T11:03:00.500Z' }],
      },
      {
        timestamp: '2026-02-01T11:06:30.000Z',
        direction: 'CS_TO_CSMS',
        message: [
          2,
          'msg-002',
          'BootNotification',
          {
            chargePointVendor: 'SyntheticVendor',
            chargePointModel: 'SM-100',
            chargePointSerialNumber: 'CS-SYNTHETIC-023',
            firmwareVersion: '1.0.0',
          },
        ],
      },
      {
        timestamp: '2026-02-01T11:06:30.500Z',
        direction: 'CSMS_TO_CS',
        message: [
          3,
          'msg-002',
          {
            currentTime: '2026-02-01T11:06:30.500Z',
            interval: 300,
            status: 'Accepted',
          },
        ],
      },
      {
        timestamp: '2026-02-01T11:09:00.000Z',
        direction: 'CS_TO_CSMS',
        message: [2, 'msg-hb-2', 'Heartbeat', {}],
      },
      {
        timestamp: '2026-02-01T11:09:00.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-hb-2', { currentTime: '2026-02-01T11:09:00.500Z' }],
      },
    ],
  },
  expectedFailures: [],
  assertions: [
    {
      type: 'no_failures',
      params: {},
    },
  ],
};
