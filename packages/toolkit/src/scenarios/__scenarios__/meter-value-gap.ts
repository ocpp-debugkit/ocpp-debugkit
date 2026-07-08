export default {
  name: 'meter-value-gap',
  description:
    'Active transaction with StartTransaction and StopTransaction but no MeterValues in between. Expects METER_VALUE_GAP failure.',
  trace: {
    traceId: 'scenario-meter-value-gap',
    metadata: {
      stationId: 'CS-SYNTHETIC-006',
      ocppVersion: '1.6',
      source: 'synthetic-scenario',
      description: 'Transaction completes without any MeterValues — metering data is missing.',
    },
    events: [
      {
        timestamp: '2024-01-15T18:00:00.000Z',
        direction: 'CS_TO_CSMS',
        message: [
          2,
          'msg-001',
          'BootNotification',
          {
            chargePointVendor: 'SyntheticVendor',
            chargePointModel: 'SM-100',
            chargePointSerialNumber: 'CS-SYNTHETIC-006',
            firmwareVersion: '1.0.0',
          },
        ],
      },
      {
        timestamp: '2024-01-15T18:00:00.500Z',
        direction: 'CSMS_TO_CS',
        message: [
          3,
          'msg-001',
          {
            currentTime: '2024-01-15T18:00:00.500Z',
            interval: 300,
            status: 'Accepted',
          },
        ],
      },
      {
        timestamp: '2024-01-15T18:01:00.000Z',
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
        timestamp: '2024-01-15T18:01:00.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-002', {}],
      },
      {
        timestamp: '2024-01-15T18:02:00.000Z',
        direction: 'CS_TO_CSMS',
        message: [
          2,
          'msg-003',
          'Authorize',
          {
            idTag: 'SYNTHETIC-TAG-006',
          },
        ],
      },
      {
        timestamp: '2024-01-15T18:02:00.500Z',
        direction: 'CSMS_TO_CS',
        message: [
          3,
          'msg-003',
          {
            idTagInfo: {
              status: 'Accepted',
              expiryDate: '2024-12-31T23:59:59.000Z',
            },
          },
        ],
      },
      {
        timestamp: '2024-01-15T18:02:30.000Z',
        direction: 'CS_TO_CSMS',
        message: [
          2,
          'msg-004',
          'StartTransaction',
          {
            connectorId: 1,
            idTag: 'SYNTHETIC-TAG-006',
            meterStart: 0,
            timestamp: '2024-01-15T18:02:30.000Z',
          },
        ],
      },
      {
        timestamp: '2024-01-15T18:02:30.500Z',
        direction: 'CSMS_TO_CS',
        message: [
          3,
          'msg-004',
          {
            transactionId: 100006,
            idTagInfo: {
              status: 'Accepted',
            },
          },
        ],
      },
      {
        timestamp: '2024-01-15T18:02:31.000Z',
        direction: 'CS_TO_CSMS',
        message: [
          2,
          'msg-005',
          'StatusNotification',
          {
            connectorId: 1,
            status: 'Charging',
            errorCode: 'NoError',
          },
        ],
      },
      {
        timestamp: '2024-01-15T18:02:31.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-005', {}],
      },
      {
        timestamp: '2024-01-15T18:07:30.000Z',
        direction: 'CS_TO_CSMS',
        message: [2, 'msg-hb-1', 'Heartbeat', {}],
      },
      {
        timestamp: '2024-01-15T18:07:30.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-hb-1', { currentTime: '2024-01-15T18:07:30.500Z' }],
      },
      {
        timestamp: '2024-01-15T18:30:00.000Z',
        direction: 'CS_TO_CSMS',
        message: [
          2,
          'msg-006',
          'StopTransaction',
          {
            transactionId: 100006,
            idTag: 'SYNTHETIC-TAG-006',
            meterStop: 0,
            timestamp: '2024-01-15T18:30:00.000Z',
            reason: 'EVDisconnected',
          },
        ],
      },
      {
        timestamp: '2024-01-15T18:30:00.500Z',
        direction: 'CSMS_TO_CS',
        message: [
          3,
          'msg-006',
          {
            idTagInfo: {
              status: 'Accepted',
            },
          },
        ],
      },
      {
        timestamp: '2024-01-15T18:30:01.000Z',
        direction: 'CS_TO_CSMS',
        message: [
          2,
          'msg-007',
          'StatusNotification',
          {
            connectorId: 1,
            status: 'Available',
            errorCode: 'NoError',
          },
        ],
      },
      {
        timestamp: '2024-01-15T18:30:01.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-007', {}],
      },
    ],
  },
  expectedFailures: ['METER_VALUE_GAP'],
};
