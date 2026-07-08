export default {
  name: 'invalid-stop-reason',
  description:
    'StopTransaction with an invalid stop reason not in the OCPP 1.6 specification. Expects INVALID_STOP_REASON failure.',
  trace: {
    traceId: 'scenario-invalid-stop-reason',
    metadata: {
      stationId: 'CS-SYNTHETIC-007',
      ocppVersion: '1.6',
      source: 'synthetic-scenario',
      description:
        'StopTransaction with reason "PowerSurge" — not a valid OCPP 1.6 stop reason code.',
    },
    events: [
      {
        timestamp: '2024-01-15T20:00:00.000Z',
        direction: 'CS_TO_CSMS',
        message: [
          2,
          'msg-001',
          'BootNotification',
          {
            chargePointVendor: 'SyntheticVendor',
            chargePointModel: 'SM-100',
            chargePointSerialNumber: 'CS-SYNTHETIC-007',
            firmwareVersion: '1.0.0',
          },
        ],
      },
      {
        timestamp: '2024-01-15T20:00:00.500Z',
        direction: 'CSMS_TO_CS',
        message: [
          3,
          'msg-001',
          {
            currentTime: '2024-01-15T20:00:00.500Z',
            interval: 300,
            status: 'Accepted',
          },
        ],
      },
      {
        timestamp: '2024-01-15T20:01:00.000Z',
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
        timestamp: '2024-01-15T20:01:00.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-002', {}],
      },
      {
        timestamp: '2024-01-15T20:02:00.000Z',
        direction: 'CS_TO_CSMS',
        message: [
          2,
          'msg-003',
          'Authorize',
          {
            idTag: 'SYNTHETIC-TAG-007',
          },
        ],
      },
      {
        timestamp: '2024-01-15T20:02:00.500Z',
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
        timestamp: '2024-01-15T20:02:30.000Z',
        direction: 'CS_TO_CSMS',
        message: [
          2,
          'msg-004',
          'StartTransaction',
          {
            connectorId: 1,
            idTag: 'SYNTHETIC-TAG-007',
            meterStart: 0,
            timestamp: '2024-01-15T20:02:30.000Z',
          },
        ],
      },
      {
        timestamp: '2024-01-15T20:02:30.500Z',
        direction: 'CSMS_TO_CS',
        message: [
          3,
          'msg-004',
          {
            transactionId: 100007,
            idTagInfo: {
              status: 'Accepted',
            },
          },
        ],
      },
      {
        timestamp: '2024-01-15T20:02:31.000Z',
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
        timestamp: '2024-01-15T20:02:31.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-005', {}],
      },
      {
        timestamp: '2024-01-15T20:07:30.000Z',
        direction: 'CS_TO_CSMS',
        message: [2, 'msg-hb-1', 'Heartbeat', {}],
      },
      {
        timestamp: '2024-01-15T20:07:30.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-hb-1', { currentTime: '2024-01-15T20:07:30.500Z' }],
      },
      {
        timestamp: '2024-01-15T20:15:00.000Z',
        direction: 'CS_TO_CSMS',
        message: [
          2,
          'msg-006',
          'MeterValues',
          {
            connectorId: 1,
            transactionId: 100007,
            meterValue: [
              {
                timestamp: '2024-01-15T20:15:00.000Z',
                sampledValue: [
                  {
                    value: '5000',
                    measurand: 'Energy.Active.Import.Register',
                    unit: 'Wh',
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        timestamp: '2024-01-15T20:15:00.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-006', {}],
      },
      {
        timestamp: '2024-01-15T20:30:00.000Z',
        direction: 'CS_TO_CSMS',
        message: [
          2,
          'msg-007',
          'StopTransaction',
          {
            transactionId: 100007,
            idTag: 'SYNTHETIC-TAG-007',
            meterStop: 5000,
            timestamp: '2024-01-15T20:30:00.000Z',
            reason: 'PowerSurge',
          },
        ],
      },
      {
        timestamp: '2024-01-15T20:30:00.500Z',
        direction: 'CSMS_TO_CS',
        message: [
          3,
          'msg-007',
          {
            idTagInfo: {
              status: 'Accepted',
            },
          },
        ],
      },
      {
        timestamp: '2024-01-15T20:30:01.000Z',
        direction: 'CS_TO_CSMS',
        message: [
          2,
          'msg-008',
          'StatusNotification',
          {
            connectorId: 1,
            status: 'Available',
            errorCode: 'NoError',
          },
        ],
      },
      {
        timestamp: '2024-01-15T20:30:01.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-008', {}],
      },
    ],
  },
  expectedFailures: ['INVALID_STOP_REASON'],
};
