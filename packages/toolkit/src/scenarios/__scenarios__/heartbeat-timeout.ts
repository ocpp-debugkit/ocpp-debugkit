export default {
  name: 'heartbeat-timeout',
  description:
    'Station boots and never sends a Heartbeat. BootNotification response sets interval=300s, threshold at 600s. StatusNotification after threshold triggers TIMEOUT_NO_HEARTBEAT.',
  trace: {
    traceId: 'scenario-heartbeat-timeout',
    metadata: {
      stationId: 'CS-SYNTHETIC-018',
      ocppVersion: '1.6',
      source: 'synthetic-scenario',
      description: 'Station boots and never sends a Heartbeat — timeout expected.',
    },
    events: [
      {
        timestamp: '2026-01-15T06:00:00.000Z',
        direction: 'CS_TO_CSMS',
        message: [
          2,
          'msg-001',
          'BootNotification',
          {
            chargePointVendor: 'SyntheticVendor',
            chargePointModel: 'SM-100',
            chargePointSerialNumber: 'CS-SYNTHETIC-018',
            firmwareVersion: '1.0.0',
          },
        ],
      },
      {
        timestamp: '2026-01-15T06:00:00.500Z',
        direction: 'CSMS_TO_CS',
        message: [
          3,
          'msg-001',
          {
            currentTime: '2026-01-15T06:00:00.500Z',
            interval: 300,
            status: 'Accepted',
          },
        ],
      },
      {
        timestamp: '2026-01-15T06:12:00.000Z',
        direction: 'CS_TO_CSMS',
        message: [
          2,
          'msg-002',
          'StatusNotification',
          { connectorId: 1, status: 'Available', errorCode: 'NoError' },
        ],
      },
      {
        timestamp: '2026-01-15T06:12:00.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-002', {}],
      },
    ],
  },
  expectedFailures: ['TIMEOUT_NO_HEARTBEAT'],
  assertions: [
    {
      type: 'failure_severity',
      params: { code: 'TIMEOUT_NO_HEARTBEAT', severity: 'warning' },
    },
    {
      type: 'failure_count',
      params: { code: 'TIMEOUT_NO_HEARTBEAT', min: 1, max: 1 },
    },
  ],
};
