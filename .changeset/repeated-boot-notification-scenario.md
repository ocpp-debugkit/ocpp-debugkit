---
'@ocpp-debugkit/toolkit': patch
---

Add `repeated-boot-notification` scenario covering the `REPEATED_BOOT_NOTIFICATION` detection rule. The synthetic trace reboots a station three times in three minutes (one `BootNotification` per minute) followed by a single `Heartbeat`, exercising the 5 minute window used by the rule.
