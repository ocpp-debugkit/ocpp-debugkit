export default {
  name: 'firmware-update-success',
  description:
    'Successful firmware update: station boots, downloads firmware, installs it successfully, and continues operating normally. No failures expected.',
  trace: {
    traceId: 'scenario-firmware-update-success',
    metadata: {
      stationId: 'CS-SYNTHETIC-012',
      ocppVersion: '1.6',
      source: 'synthetic-scenario',
      description:
        'Station boots, reports the firmware as downloaded and installed within seconds, then sends a heartbeat.',
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
            chargePointSerialNumber: 'CS-SYNTHETIC-012',
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
        timestamp: '2024-01-15T06:00:30.000Z',
        direction: 'CS_TO_CSMS',
        message: [
          2,
          'msg-002',
          'FirmwareStatusNotification',
          { status: 'Downloaded' },
        ],
      },
      {
        timestamp: '2024-01-15T06:00:30.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-002', {}],
      },
      {
        timestamp: '2024-01-15T06:01:00.000Z',
        direction: 'CS_TO_CSMS',
        message: [
          2,
          'msg-003',
          'FirmwareStatusNotification',
          { status: 'Installed' },
        ],
      },
      {
        timestamp: '2024-01-15T06:01:00.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-003', {}],
      },
      {
        timestamp: '2024-01-15T06:03:00.000Z',
        direction: 'CS_TO_CSMS',
        message: [2, 'msg-hb-1', 'Heartbeat', {}],
      },
      {
        timestamp: '2024-01-15T06:03:00.500Z',
        direction: 'CSMS_TO_CS',
        message: [
          3,
          'msg-hb-1',
          { currentTime: '2024-01-15T06:03:00.500Z' },
        ],
      },
    ],
  },
  expectedFailures: [],
  assertions: [{ type: 'no_failures', params: {} }],
};
