export default {
  name: 'diagnostics-failure',
  description:
    'DiagnosticsStatusNotification with DiagnosisFailed status indicating a hardware diagnostics failure. Expects DIAGNOSTICS_FAILURE failure.',
  trace: {
    traceId: 'scenario-diagnostics-failure',
    metadata: {
      stationId: 'CS-SYNTHETIC-010',
      ocppVersion: '1.6',
      source: 'synthetic-scenario',
      description:
        'Station reports a diagnostics failure via DiagnosticsStatusNotification with status DiagnosisFailed.',
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
            chargePointSerialNumber: 'CS-SYNTHETIC-010',
            firmwareVersion: '1.0.0',
          },
        ],
      },
      {
        timestamp: '2024-01-15T06:00:00.500Z',
        direction: 'CSMS_TO_CS',
        message: [
          3,
          'msg-001',
          {
            currentTime: '2024-01-15T06:00:00.500Z',
            interval: 300,
            status: 'Accepted',
          },
        ],
      },
      {
        timestamp: '2024-01-15T06:01:00.000Z',
        direction: 'CS_TO_CSMS',
        message: [
          2,
          'msg-002',
          'StatusNotification',
          {
            connectorId: 0,
            status: 'Available',
            errorCode: 'NoError',
          },
        ],
      },
      {
        timestamp: '2024-01-15T06:01:00.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-002', {}],
      },
      {
        timestamp: '2024-01-15T06:07:30.000Z',
        direction: 'CS_TO_CSMS',
        message: [2, 'msg-hb-1', 'Heartbeat', {}],
      },
      {
        timestamp: '2024-01-15T06:07:30.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-hb-1', { currentTime: '2024-01-15T06:07:30.500Z' }],
      },
      {
        timestamp: '2024-01-15T06:12:00.000Z',
        direction: 'CS_TO_CSMS',
        message: [
          2,
          'msg-003',
          'DiagnosticsStatusNotification',
          {
            status: 'DiagnosisFailed',
          },
        ],
      },
      {
        timestamp: '2024-01-15T06:12:00.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-003', {}],
      },
    ],
  },
  expectedFailures: ['DIAGNOSTICS_FAILURE'],
};
