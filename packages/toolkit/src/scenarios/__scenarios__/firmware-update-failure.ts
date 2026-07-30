export default {
  name: 'firmware-update-failure',
  description:
    'Firmware update failure: station boots, firmware download initiates but install fails with InstallFailed status. Expects FIRMWARE_UPDATE_FAILURE failure.',
  trace: {
    traceId: 'scenario-firmware-update-failure',
    metadata: {
      stationId: 'CS-SYNTHETIC-019',
      ocppVersion: '1.6',
      source: 'synthetic-scenario',
      description:
        'Station boots, reports Downloading firmware, then InstallFailed within seconds, followed by a heartbeat to confirm station is still online.',
    },
    events: [
      {
        timestamp: '2026-01-15T07:00:00.000Z',
        direction: 'CS_TO_CSMS',
        message: [
          2,
          'msg-001',
          'BootNotification',
          {
            chargePointVendor: 'SyntheticVendor',
            chargePointModel: 'SM-100',
            chargePointSerialNumber: 'CS-SYNTHETIC-019',
            firmwareVersion: '1.0.0',
          },
        ],
      },
      {
        timestamp: '2026-01-15T07:00:00.500Z',
        direction: 'CSMS_TO_CS',
        message: [
          3,
          'msg-001',
          {
            currentTime: '2026-01-15T07:00:00.500Z',
            interval: 300,
            status: 'Accepted',
          },
        ],
      },
      {
        timestamp: '2026-01-15T07:00:30.000Z',
        direction: 'CS_TO_CSMS',
        message: [2, 'msg-002', 'FirmwareStatusNotification', { status: 'Downloading' }],
      },
      {
        timestamp: '2026-01-15T07:00:30.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-002', {}],
      },
      {
        timestamp: '2026-01-15T07:01:00.000Z',
        direction: 'CS_TO_CSMS',
        message: [2, 'msg-003', 'FirmwareStatusNotification', { status: 'InstallFailed' }],
      },
      {
        timestamp: '2026-01-15T07:01:00.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-003', {}],
      },
      {
        timestamp: '2026-01-15T07:02:00.000Z',
        direction: 'CS_TO_CSMS',
        message: [2, 'msg-hb-1', 'Heartbeat', {}],
      },
      {
        timestamp: '2026-01-15T07:02:00.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-hb-1', { currentTime: '2026-01-15T07:02:00.500Z' }],
      },
    ],
  },
  expectedFailures: ['FIRMWARE_UPDATE_FAILURE'],
  assertions: [{ type: 'failure_count', params: { code: 'FIRMWARE_UPDATE_FAILURE', min: 1 } }],
};
