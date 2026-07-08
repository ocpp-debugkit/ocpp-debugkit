export default {
  traceId: 'fixture-failed-auth',
  metadata: {
    stationId: 'CS-SYNTHETIC-002',
    ocppVersion: '1.6',
    source: 'synthetic-fixture',
    description:
      'Failed authorization: station boots, connector prepares, idTag is rejected by CSMS. StartTransaction is not attempted. Expects FAILED_AUTHORIZATION failure.',
  },
  events: [
    {
      timestamp: '2024-01-15T11:00:00.000Z',
      direction: 'CS_TO_CSMS',
      message: [
        2,
        'msg-001',
        'BootNotification',
        {
          chargePointVendor: 'SyntheticVendor',
          chargePointModel: 'SM-100',
          chargePointSerialNumber: 'CS-SYNTHETIC-002',
          firmwareVersion: '1.0.0',
        },
      ],
    },
    {
      timestamp: '2024-01-15T11:00:00.500Z',
      direction: 'CSMS_TO_CS',
      message: [
        3,
        'msg-001',
        {
          currentTime: '2024-01-15T11:00:00.500Z',
          interval: 300,
          status: 'Accepted',
        },
      ],
    },
    {
      timestamp: '2024-01-15T11:01:00.000Z',
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
      timestamp: '2024-01-15T11:01:00.500Z',
      direction: 'CSMS_TO_CS',
      message: [3, 'msg-002', {}],
    },
    {
      timestamp: '2024-01-15T11:02:00.000Z',
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
      timestamp: '2024-01-15T11:02:00.500Z',
      direction: 'CSMS_TO_CS',
      message: [3, 'msg-003', {}],
    },
    {
      timestamp: '2024-01-15T11:02:15.000Z',
      direction: 'CS_TO_CSMS',
      message: [
        2,
        'msg-004',
        'Authorize',
        {
          idTag: 'SYNTHETIC-TAG-INVALID',
        },
      ],
    },
    {
      timestamp: '2024-01-15T11:02:15.500Z',
      direction: 'CSMS_TO_CS',
      message: [
        3,
        'msg-004',
        {
          idTagInfo: {
            status: 'Invalid',
          },
        },
      ],
    },
    {
      timestamp: '2024-01-15T11:02:20.000Z',
      direction: 'CS_TO_CSMS',
      message: [
        2,
        'msg-005',
        'Authorize',
        {
          idTag: 'SYNTHETIC-TAG-INVALID',
        },
      ],
    },
    {
      timestamp: '2024-01-15T11:02:20.500Z',
      direction: 'CSMS_TO_CS',
      message: [
        3,
        'msg-005',
        {
          idTagInfo: {
            status: 'Invalid',
          },
        },
      ],
    },
    {
      timestamp: '2024-01-15T11:02:30.000Z',
      direction: 'CS_TO_CSMS',
      message: [
        2,
        'msg-006',
        'Authorize',
        {
          idTag: 'SYNTHETIC-TAG-INVALID',
        },
      ],
    },
    {
      timestamp: '2024-01-15T11:02:30.500Z',
      direction: 'CSMS_TO_CS',
      message: [
        3,
        'msg-006',
        {
          idTagInfo: {
            status: 'Invalid',
          },
        },
      ],
    },
    {
      timestamp: '2024-01-15T11:02:40.000Z',
      direction: 'CS_TO_CSMS',
      message: [
        2,
        'msg-007',
        'StatusNotification',
        {
          connectorId: 1,
          status: 'Faulted',
          errorCode: 'OtherError',
          info: 'Authorization failed after 3 attempts',
        },
      ],
    },
    {
      timestamp: '2024-01-15T11:02:40.500Z',
      direction: 'CSMS_TO_CS',
      message: [3, 'msg-007', {}],
    },
  ],
};
