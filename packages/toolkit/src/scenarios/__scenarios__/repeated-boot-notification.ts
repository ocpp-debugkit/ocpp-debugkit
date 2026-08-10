export default {
  name: 'repeated-boot-notification',
  description:
    'Station rebooting in a loop: three BootNotification calls one minute apart, followed by a single Heartbeat. All three boots land inside the five minute window. Expects REPEATED_BOOT_NOTIFICATION failure. Uses event_count assertion for BootNotification.',
  trace: {
    traceId: 'scenario-repeated-boot-notification',
    metadata: {
      stationId: 'CS-SYNTHETIC-020',
      ocppVersion: '1.6',
      source: 'synthetic-scenario',
      description: 'Station reboots three times in three minutes — reboot loop expected.',
    },
    events: [
      {
        timestamp: '2026-01-15T08:00:00.000Z',
        direction: 'CS_TO_CSMS',
        message: [
          2,
          'msg-boot-1',
          'BootNotification',
          {
            chargePointVendor: 'SyntheticVendor',
            chargePointModel: 'SM-100',
            chargePointSerialNumber: 'CS-SYNTHETIC-020',
            firmwareVersion: '1.0.0',
          },
        ],
      },
      {
        timestamp: '2026-01-15T08:00:00.500Z',
        direction: 'CSMS_TO_CS',
        message: [
          3,
          'msg-boot-1',
          {
            currentTime: '2026-01-15T08:00:00.500Z',
            interval: 300,
            status: 'Accepted',
          },
        ],
      },
      {
        timestamp: '2026-01-15T08:01:00.000Z',
        direction: 'CS_TO_CSMS',
        message: [
          2,
          'msg-boot-2',
          'BootNotification',
          {
            chargePointVendor: 'SyntheticVendor',
            chargePointModel: 'SM-100',
            chargePointSerialNumber: 'CS-SYNTHETIC-020',
            firmwareVersion: '1.0.0',
          },
        ],
      },
      {
        timestamp: '2026-01-15T08:01:00.500Z',
        direction: 'CSMS_TO_CS',
        message: [
          3,
          'msg-boot-2',
          {
            currentTime: '2026-01-15T08:01:00.500Z',
            interval: 300,
            status: 'Accepted',
          },
        ],
      },
      {
        timestamp: '2026-01-15T08:02:00.000Z',
        direction: 'CS_TO_CSMS',
        message: [
          2,
          'msg-boot-3',
          'BootNotification',
          {
            chargePointVendor: 'SyntheticVendor',
            chargePointModel: 'SM-100',
            chargePointSerialNumber: 'CS-SYNTHETIC-020',
            firmwareVersion: '1.0.0',
          },
        ],
      },
      {
        timestamp: '2026-01-15T08:02:00.500Z',
        direction: 'CSMS_TO_CS',
        message: [
          3,
          'msg-boot-3',
          {
            currentTime: '2026-01-15T08:02:00.500Z',
            interval: 300,
            status: 'Accepted',
          },
        ],
      },
      {
        timestamp: '2026-01-15T08:03:00.000Z',
        direction: 'CS_TO_CSMS',
        message: [2, 'msg-hb-1', 'Heartbeat', {}],
      },
      {
        timestamp: '2026-01-15T08:03:00.500Z',
        direction: 'CSMS_TO_CS',
        message: [3, 'msg-hb-1', { currentTime: '2026-01-15T08:03:00.500Z' }],
      },
    ],
  },
  expectedFailures: ['REPEATED_BOOT_NOTIFICATION'],
  assertions: [
    {
      type: 'event_count',
      params: { action: 'BootNotification', min: 3 },
    },
  ],
};
