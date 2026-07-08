export default {
  traceId: 'fixture-normal-session',
  metadata: {
    stationId: 'CS-SYNTHETIC-001',
    ocppVersion: '1.6',
    source: 'synthetic-fixture',
    description:
      'Normal charging session: boot → authorize → start transaction → meter values → stop transaction. No failures expected.',
  },
  events: [
    {
      timestamp: '2024-01-15T10:00:00.000Z',
      direction: 'CS_TO_CSMS',
      message: [
        2,
        'msg-001',
        'BootNotification',
        {
          chargePointVendor: 'SyntheticVendor',
          chargePointModel: 'SM-100',
          chargePointSerialNumber: 'CS-SYNTHETIC-001',
          firmwareVersion: '1.0.0',
        },
      ],
    },
    {
      timestamp: '2024-01-15T10:00:00.500Z',
      direction: 'CSMS_TO_CS',
      message: [
        3,
        'msg-001',
        {
          currentTime: '2024-01-15T10:00:00.500Z',
          interval: 300,
          status: 'Accepted',
        },
      ],
    },
    {
      timestamp: '2024-01-15T10:01:00.000Z',
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
      timestamp: '2024-01-15T10:01:00.500Z',
      direction: 'CSMS_TO_CS',
      message: [3, 'msg-002', {}],
    },
    {
      timestamp: '2024-01-15T10:02:00.000Z',
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
      timestamp: '2024-01-15T10:02:00.500Z',
      direction: 'CSMS_TO_CS',
      message: [3, 'msg-003', {}],
    },
    {
      timestamp: '2024-01-15T10:02:15.000Z',
      direction: 'CS_TO_CSMS',
      message: [
        2,
        'msg-004',
        'Authorize',
        {
          idTag: 'SYNTHETIC-TAG-001',
        },
      ],
    },
    {
      timestamp: '2024-01-15T10:02:15.500Z',
      direction: 'CSMS_TO_CS',
      message: [
        3,
        'msg-004',
        {
          idTagInfo: {
            status: 'Accepted',
            expiryDate: '2024-12-31T23:59:59.000Z',
            parentIdTag: 'SYNTHETIC-PARENT-001',
          },
        },
      ],
    },
    {
      timestamp: '2024-01-15T10:02:30.000Z',
      direction: 'CS_TO_CSMS',
      message: [
        2,
        'msg-005',
        'StartTransaction',
        {
          connectorId: 1,
          idTag: 'SYNTHETIC-TAG-001',
          meterStart: 0,
          timestamp: '2024-01-15T10:02:30.000Z',
        },
      ],
    },
    {
      timestamp: '2024-01-15T10:02:30.500Z',
      direction: 'CSMS_TO_CS',
      message: [
        3,
        'msg-005',
        {
          transactionId: 100001,
          idTagInfo: {
            status: 'Accepted',
          },
        },
      ],
    },
    {
      timestamp: '2024-01-15T10:02:31.000Z',
      direction: 'CS_TO_CSMS',
      message: [
        2,
        'msg-006',
        'StatusNotification',
        {
          connectorId: 1,
          status: 'Charging',
          errorCode: 'NoError',
        },
      ],
    },
    {
      timestamp: '2024-01-15T10:02:31.500Z',
      direction: 'CSMS_TO_CS',
      message: [3, 'msg-006', {}],
    },
    {
      timestamp: '2024-01-15T10:15:00.000Z',
      direction: 'CS_TO_CSMS',
      message: [
        2,
        'msg-007',
        'MeterValues',
        {
          connectorId: 1,
          transactionId: 100001,
          meterValue: [
            {
              timestamp: '2024-01-15T10:15:00.000Z',
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
      timestamp: '2024-01-15T10:15:00.500Z',
      direction: 'CSMS_TO_CS',
      message: [3, 'msg-007', {}],
    },
    {
      timestamp: '2024-01-15T10:30:00.000Z',
      direction: 'CS_TO_CSMS',
      message: [
        2,
        'msg-008',
        'MeterValues',
        {
          connectorId: 1,
          transactionId: 100001,
          meterValue: [
            {
              timestamp: '2024-01-15T10:30:00.000Z',
              sampledValue: [
                {
                  value: '10000',
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
      timestamp: '2024-01-15T10:30:00.500Z',
      direction: 'CSMS_TO_CS',
      message: [3, 'msg-008', {}],
    },
    {
      timestamp: '2024-01-15T10:35:00.000Z',
      direction: 'CS_TO_CSMS',
      message: [
        2,
        'msg-009',
        'StopTransaction',
        {
          transactionId: 100001,
          idTag: 'SYNTHETIC-TAG-001',
          meterStop: 10000,
          timestamp: '2024-01-15T10:35:00.000Z',
          reason: 'EVDisconnected',
        },
      ],
    },
    {
      timestamp: '2024-01-15T10:35:00.500Z',
      direction: 'CSMS_TO_CS',
      message: [
        3,
        'msg-009',
        {
          idTagInfo: {
            status: 'Accepted',
          },
        },
      ],
    },
    {
      timestamp: '2024-01-15T10:35:01.000Z',
      direction: 'CS_TO_CSMS',
      message: [
        2,
        'msg-010',
        'StatusNotification',
        {
          connectorId: 1,
          status: 'Available',
          errorCode: 'NoError',
        },
      ],
    },
    {
      timestamp: '2024-01-15T10:35:01.500Z',
      direction: 'CSMS_TO_CS',
      message: [3, 'msg-010', {}],
    },
  ],
};
