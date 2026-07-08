export default {
  name: 'status-transition-violation',
  description:
    'Connector status transitions from Available directly to Finishing, which is not a valid OCPP 1.6 transition. Expects STATUS_TRANSITION_VIOLATION failure.',
  trace: {
    traceId: 'scenario-status-transition-violation',
    metadata: {
      stationId: 'CS-SYNTHETIC-009',
      ocppVersion: '1.6',
      source: 'synthetic-scenario',
      description:
        'Connector status jumps from Available to Finishing without going through Preparing/Charging — invalid OCPP 1.6 transition.',
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
            chargePointSerialNumber: 'CS-SYNTHETIC-009',
            firmwareVersion: '1.0.0',
          },
        ],
      },
      {
        timestamp: '2024-01-15T08:00:00.500Z',
        direction: 'CSMS_TO_CS',
        message: [
          3,
          'msg-001',
          {
            currentTime: '2024-01-15T08:00:00.500Z',
            interval: 300,
            status: 'Accepted',
          },
        ],
      },
      {
        timestamp: '2024-01-15T08:01:00.000Z',
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
        timestamp: '2024-01-15T08:01:00.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-002', {}],
      },
      {
        timestamp: '2024-01-15T08:02:00.000Z',
        direction: 'CS_TO_CSMS',
        message: [
          2,
          'msg-003',
          'StatusNotification',
          {
            connectorId: 1,
            status: 'Available',
            errorCode: 'NoError',
          },
        ],
      },
      {
        timestamp: '2024-01-15T08:02:00.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-003', {}],
      },
      {
        timestamp: '2024-01-15T08:07:30.000Z',
        direction: 'CS_TO_CSMS',
        message: [2, 'msg-hb-1', 'Heartbeat', {}],
      },
      {
        timestamp: '2024-01-15T08:07:30.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-hb-1', { currentTime: '2024-01-15T08:07:30.500Z' }],
      },
      {
        timestamp: '2024-01-15T08:12:00.000Z',
        direction: 'CS_TO_CSMS',
        message: [
          2,
          'msg-004',
          'StatusNotification',
          {
            connectorId: 1,
            status: 'Finishing',
            errorCode: 'NoError',
          },
        ],
      },
      {
        timestamp: '2024-01-15T08:12:00.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-004', {}],
      },
    ],
  },
  expectedFailures: ['STATUS_TRANSITION_VIOLATION'],
};
