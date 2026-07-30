export default {
  name: 'refused-authorization',
  description:
    'Authorization refused three times with the non-Invalid statuses of OCPP 1.6 section 7.2: Blocked, Expired, ConcurrentTx. StartTransaction is not attempted. Expects FAILED_AUTHORIZATION failure.',
  trace: {
    traceId: 'scenario-refused-authorization',
    metadata: {
      stationId: 'CS-SYNTHETIC-017',
      ocppVersion: '1.6',
      source: 'synthetic-scenario',
      description:
        'Station boots, connector prepares, then three idTags are refused in turn: one Blocked, one Expired, one ConcurrentTx. Section 7.2 marks ConcurrentTx as relevant to StartTransaction, so an Authorize response carrying it is irregular; it is included because the rule treats every non-Accepted status as a refusal wherever it appears. The connector returns to Available without a transaction.',
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
            chargePointSerialNumber: 'CS-SYNTHETIC-017',
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
          {
            currentTime: '2026-01-15T09:00:00.500Z',
            interval: 300,
            status: 'Accepted',
          },
        ],
      },
      {
        timestamp: '2026-01-15T09:00:05.000Z',
        direction: 'CS_TO_CSMS',
        message: [
          2,
          'msg-002',
          'StatusNotification',
          { connectorId: 0, status: 'Available', errorCode: 'NoError' },
        ],
      },
      {
        timestamp: '2026-01-15T09:00:05.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-002', {}],
      },
      {
        timestamp: '2026-01-15T09:00:10.000Z',
        direction: 'CS_TO_CSMS',
        message: [
          2,
          'msg-003',
          'StatusNotification',
          { connectorId: 1, status: 'Preparing', errorCode: 'NoError' },
        ],
      },
      {
        timestamp: '2026-01-15T09:00:10.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-003', {}],
      },
      {
        timestamp: '2026-01-15T09:00:20.000Z',
        direction: 'CS_TO_CSMS',
        message: [2, 'msg-004', 'Authorize', { idTag: 'SYNTHETIC-TAG-201' }],
      },
      {
        timestamp: '2026-01-15T09:00:20.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-004', { idTagInfo: { status: 'Blocked' } }],
      },
      {
        timestamp: '2026-01-15T09:00:35.000Z',
        direction: 'CS_TO_CSMS',
        message: [2, 'msg-005', 'Authorize', { idTag: 'SYNTHETIC-TAG-202' }],
      },
      {
        timestamp: '2026-01-15T09:00:35.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-005', { idTagInfo: { status: 'Expired' } }],
      },
      {
        timestamp: '2026-01-15T09:00:50.000Z',
        direction: 'CS_TO_CSMS',
        message: [2, 'msg-006', 'Authorize', { idTag: 'SYNTHETIC-TAG-203' }],
      },
      {
        timestamp: '2026-01-15T09:00:50.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-006', { idTagInfo: { status: 'ConcurrentTx' } }],
      },
      {
        timestamp: '2026-01-15T09:01:05.000Z',
        direction: 'CS_TO_CSMS',
        message: [
          2,
          'msg-007',
          'StatusNotification',
          { connectorId: 1, status: 'Available', errorCode: 'NoError' },
        ],
      },
      {
        timestamp: '2026-01-15T09:01:05.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-007', {}],
      },
    ],
  },
  expectedFailures: ['FAILED_AUTHORIZATION'],
  assertions: [{ type: 'failure_count', params: { code: 'FAILED_AUTHORIZATION', min: 3 } }],
};
