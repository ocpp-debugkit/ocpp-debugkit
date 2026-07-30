---
'@ocpp-debugkit/toolkit': patch
---

Match `FIRMWARE_UPDATE_FAILURE` to the OCPP 1.6 `FirmwareStatus` enumeration (#154, edition 2 section 7.25). The rule matched `DownloadPaused`, `InstallFailed` and `InstallRebootingFailed`, none of which are 1.6 status values, and did not match `InstallationFailed`, which is one of the two failure values the enumeration defines. A conformant station reporting a failed installation, the more consequential of the two firmware outcomes, went undetected. The rule now matches exactly `DownloadFailed` and `InstallationFailed`, and the `firmware-update-failure` scenario reports `InstallationFailed` instead of the non-spec `InstallFailed` it used before.
