export default {
  name: 'status-transitions-legal',
  description:
    'Connector walks a completely legal OCPP 1.6 status path (Available -> Preparing -> Charging -> Finishing -> Available). A legal negative control that must not trigger STATUS_TRANSITION_VIOLATION.',
  trace: {
    traceId: 'scenario-status-transitions-legal',
    metadata: {
      stationId: 'CS-SYNTHETIC-022',
      ocppVersion: '1.6',
      source: 'synthetic-scenario',
      description:
        'Connector status transitions strictly along the path the OCPP 1.6 section 4.9 table permits, with a trailing heartbeat to keep heartbeat rules quiet.',
    },
    events: [
      {
        timestamp: '2026-02-01T10:00:00.000Z',
        direction: 'CS_TO_CSMS',
        message: [
          2,
          'msg-001',
          'BootNotification',
          {
            chargePointVendor: 'SyntheticVendor',
            chargePointModel: 'SM-100',
            chargePointSerialNumber: 'CS-SYNTHETIC-022',
            firmwareVersion: '1.0.0',
          },
        ],
      },
      {
        timestamp: '2026-02-01T10:00:00.500Z',
        direction: 'CSMS_TO_CS',
        message: [
          3,
          'msg-001',
          {
            currentTime: '2026-02-01T10:00:00.500Z',
            interval: 300,
            status: 'Accepted',
          },
        ],
      },
      {
        timestamp: '2026-02-01T10:00:30.000Z',
        direction: 'CS_TO_CSMS',
        message: [
          2,
          'msg-002',
          'StatusNotification',
          {
            connectorId: 1,
            status: 'Available',
            errorCode: 'NoError',
          },
        ],
      },
      {
        timestamp: '2026-02-01T10:00:30.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-002', {}],
      },
      {
        timestamp: '2026-02-01T10:01:00.000Z',
        direction: 'CS_TO_CSMS',
        message: [
          2,
          'msg-003',
          'StatusNotification',
          {
            connectorId: 1,
            status: 'Preparing',
            errorCode: 'NoError',
          },
        ],
      },
      {
        timestamp: '2026-02-01T10:01:00.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-003', {}],
      },
      {
        timestamp: '2026-02-01T10:02:00.000Z',
        direction: 'CS_TO_CSMS',
        message: [
          2,
          'msg-004',
          'StatusNotification',
          {
            connectorId: 1,
            status: 'Charging',
            errorCode: 'NoError',
          },
        ],
      },
      {
        timestamp: '2026-02-01T10:02:00.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-004', {}],
      },
      {
        timestamp: '2026-02-01T10:03:00.000Z',
        direction: 'CS_TO_CSMS',
        message: [
          2,
          'msg-005',
          'StatusNotification',
          {
            connectorId: 1,
            status: 'Finishing',
            errorCode: 'NoError',
          },
        ],
      },
      {
        timestamp: '2026-02-01T10:03:00.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-005', {}],
      },
      {
        timestamp: '2026-02-01T10:04:00.000Z',
        direction: 'CS_TO_CSMS',
        message: [
          2,
          'msg-006',
          'StatusNotification',
          {
            connectorId: 1,
            status: 'Available',
            errorCode: 'NoError',
          },
        ],
      },
      {
        timestamp: '2026-02-01T10:04:00.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-006', {}],
      },
      {
        timestamp: '2026-02-01T10:05:00.000Z',
        direction: 'CS_TO_CSMS',
        message: [2, 'msg-007', 'Heartbeat', {}],
      },
      {
        timestamp: '2026-02-01T10:05:00.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-007', { currentTime: '2026-02-01T10:05:00.500Z' }],
      },
    ],
  },
  expectedFailures: [],
  assertions: [{ type: 'no_failures', params: {} }],
};
