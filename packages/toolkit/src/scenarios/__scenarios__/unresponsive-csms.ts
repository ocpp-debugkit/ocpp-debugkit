export default {
  name: 'unresponsive-csms',
  description:
    'BootNotification Call sent but CSMS never responds — no CallResult or CallError. Expects UNRESPONSIVE_CSMS failure. Uses failure_severity and failure_count assertions.',
  trace: {
    traceId: 'scenario-unresponsive-csms',
    metadata: {
      stationId: 'CS-SYNTHETIC-015',
      ocppVersion: '1.6',
      source: 'synthetic-scenario',
      description: 'CSMS never responds to BootNotification — unresponsive CSMS.',
    },
    events: [
      {
        timestamp: '2024-01-15T08:00:00.000Z',
        direction: 'CS_TO_CSMS',
        message: [
          2,
          'msg-001',
          'BootNotification',
          {
            chargePointVendor: 'SyntheticVendor',
            chargePointModel: 'SM-100',
            chargePointSerialNumber: 'CS-SYNTHETIC-015',
            firmwareVersion: '1.0.0',
          },
        ],
      },
      // No CallResult for msg-001 — CSMS unresponsive
      {
        timestamp: '2024-01-15T08:00:05.000Z',
        direction: 'CS_TO_CSMS',
        message: [2, 'msg-002', 'Heartbeat', {}],
      },
      {
        timestamp: '2024-01-15T08:00:05.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-002', { currentTime: '2024-01-15T08:00:05.500Z' }],
      },
    ],
  },
  expectedFailures: ['UNRESPONSIVE_CSMS'],
  assertions: [
    {
      type: 'failure_severity',
      params: { code: 'UNRESPONSIVE_CSMS', severity: 'critical' },
    },
    {
      type: 'failure_count',
      params: { code: 'UNRESPONSIVE_CSMS', min: 1, max: 1 },
    },
  ],
};
