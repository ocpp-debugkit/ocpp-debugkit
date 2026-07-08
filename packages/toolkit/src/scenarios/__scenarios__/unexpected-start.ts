export default {
  name: 'unexpected-start',
  description:
    'StartTransaction without preceding BootNotification or Authorize. Expects UNEXPECTED_START failure.',
  trace: {
    traceId: 'scenario-unexpected-start',
    metadata: {
      stationId: 'CS-SYNTHETIC-008',
      ocppVersion: '1.6',
      source: 'synthetic-scenario',
      description:
        'Station sends StartTransaction without BootNotification or Authorize — transaction started without proper initialization.',
    },
    events: [
      {
        timestamp: '2024-01-15T22:00:00.000Z',
        direction: 'CS_TO_CSMS',
        message: [
          2,
          'msg-001',
          'StartTransaction',
          {
            connectorId: 1,
            idTag: 'SYNTHETIC-TAG-008',
            meterStart: 0,
            timestamp: '2024-01-15T22:00:00.000Z',
          },
        ],
      },
      {
        timestamp: '2024-01-15T22:00:00.500Z',
        direction: 'CSMS_TO_CS',
        message: [
          3,
          'msg-001',
          {
            transactionId: 100008,
            idTagInfo: {
              status: 'Accepted',
            },
          },
        ],
      },
      {
        timestamp: '2024-01-15T22:00:01.000Z',
        direction: 'CS_TO_CSMS',
        message: [
          2,
          'msg-002',
          'StatusNotification',
          {
            connectorId: 1,
            status: 'Charging',
            errorCode: 'NoError',
          },
        ],
      },
      {
        timestamp: '2024-01-15T22:00:01.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-002', {}],
      },
      {
        timestamp: '2024-01-15T22:00:10.000Z',
        direction: 'CS_TO_CSMS',
        message: [
          2,
          'msg-003',
          'MeterValues',
          {
            connectorId: 1,
            transactionId: 100008,
            meterValue: [
              {
                timestamp: '2024-01-15T22:00:10.000Z',
                sampledValue: [
                  {
                    value: '100',
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
        timestamp: '2024-01-15T22:00:10.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-003', {}],
      },
      {
        timestamp: '2024-01-15T22:00:30.000Z',
        direction: 'CS_TO_CSMS',
        message: [
          2,
          'msg-004',
          'StopTransaction',
          {
            transactionId: 100008,
            idTag: 'SYNTHETIC-TAG-008',
            meterStop: 100,
            timestamp: '2024-01-15T22:00:30.000Z',
            reason: 'EVDisconnected',
          },
        ],
      },
      {
        timestamp: '2024-01-15T22:00:30.500Z',
        direction: 'CSMS_TO_CS',
        message: [
          3,
          'msg-004',
          {
            idTagInfo: {
              status: 'Accepted',
            },
          },
        ],
      },
    ],
  },
  expectedFailures: ['UNEXPECTED_START'],
};
