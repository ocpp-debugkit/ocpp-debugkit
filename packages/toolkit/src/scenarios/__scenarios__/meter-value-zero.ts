export default {
  name: 'meter-value-zero',
  description:
    'Transaction with a flat zero meter register throughout. A zero reading is a valid negative control and must not trigger METER_VALUE_ANOMALY.',
  trace: {
    traceId: 'scenario-meter-value-zero',
    metadata: {
      stationId: 'CS-SYNTHETIC-021',
      ocppVersion: '1.6',
      source: 'synthetic-scenario',
      description:
        'Station completes a four-minute transaction while the cumulative energy register remains at zero.',
    },
    events: [
      {
        timestamp: '2026-01-15T09:00:00.000Z',
        direction: 'CS_TO_CSMS',
        message: [
          2,
          'msg-001',
          'BootNotification',
          {
            chargePointVendor: 'SyntheticVendor',
            chargePointModel: 'SM-100',
            chargePointSerialNumber: 'CS-SYNTHETIC-021',
            firmwareVersion: '1.0.0',
          },
        ],
      },
      {
        timestamp: '2026-01-15T09:00:00.500Z',
        direction: 'CSMS_TO_CS',
        message: [
          3,
          'msg-001',
          { currentTime: '2026-01-15T09:00:00.500Z', interval: 300, status: 'Accepted' },
        ],
      },
      {
        timestamp: '2026-01-15T09:00:30.000Z',
        direction: 'CS_TO_CSMS',
        message: [2, 'msg-002', 'Authorize', { idTag: 'SYNTHETIC-TAG-017' }],
      },
      {
        timestamp: '2026-01-15T09:00:30.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-002', { idTagInfo: { status: 'Accepted' } }],
      },
      {
        timestamp: '2026-01-15T09:01:00.000Z',
        direction: 'CS_TO_CSMS',
        message: [
          2,
          'msg-003',
          'StartTransaction',
          { connectorId: 1, idTag: 'SYNTHETIC-TAG-017', meterStart: 0 },
        ],
      },
      {
        timestamp: '2026-01-15T09:01:00.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-003', { idTagInfo: { status: 'Accepted' }, transactionId: 100017 }],
      },
      {
        timestamp: '2026-01-15T09:02:00.000Z',
        direction: 'CS_TO_CSMS',
        message: [
          2,
          'msg-004',
          'MeterValues',
          {
            connectorId: 1,
            transactionId: 100017,
            meterValue: [
              {
                sampledValue: [
                  { value: '0', measurand: 'Energy.Active.Import.Register', unit: 'Wh' },
                ],
              },
            ],
          },
        ],
      },
      {
        timestamp: '2026-01-15T09:02:00.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-004', {}],
      },
      {
        timestamp: '2026-01-15T09:03:00.000Z',
        direction: 'CS_TO_CSMS',
        message: [
          2,
          'msg-005',
          'MeterValues',
          {
            connectorId: 1,
            transactionId: 100017,
            meterValue: [
              {
                sampledValue: [
                  { value: '0', measurand: 'Energy.Active.Import.Register', unit: 'Wh' },
                ],
              },
            ],
          },
        ],
      },
      {
        timestamp: '2026-01-15T09:03:00.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-005', {}],
      },
      {
        timestamp: '2026-01-15T09:04:00.000Z',
        direction: 'CS_TO_CSMS',
        message: [
          2,
          'msg-006',
          'MeterValues',
          {
            connectorId: 1,
            transactionId: 100017,
            meterValue: [
              {
                sampledValue: [
                  { value: '0', measurand: 'Energy.Active.Import.Register', unit: 'Wh' },
                ],
              },
            ],
          },
        ],
      },
      {
        timestamp: '2026-01-15T09:04:00.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-006', {}],
      },
      {
        timestamp: '2026-01-15T09:05:00.000Z',
        direction: 'CS_TO_CSMS',
        message: [
          2,
          'msg-007',
          'StopTransaction',
          {
            transactionId: 100017,
            idTag: 'SYNTHETIC-TAG-017',
            meterStop: 0,
            reason: 'Local',
          },
        ],
      },
      {
        timestamp: '2026-01-15T09:05:00.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-007', { idTagInfo: { status: 'Accepted' } }],
      },
    ],
  },
  expectedFailures: [],
  assertions: [{ type: 'no_failures', params: {} }],
};
