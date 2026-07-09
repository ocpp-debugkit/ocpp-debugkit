# CI Integration Example

Demonstrates how to use `ocpp-debugkit ci` in a GitHub Actions workflow to
run scenario tests as part of your CI pipeline.

## Setup

1. Install the CLI:
   ```bash
   npm install -g @ocpp-debugkit/toolkit
   ```

2. Create scenario files in `scenarios/` (JSON files with the scenario format).

3. Add the workflow file to `.github/workflows/`.

## Workflow

The included workflow (`.github/workflows/ocpp-test.yml`) runs:
```bash
ocpp-debugkit ci --format json
```

It exits 0 if all scenarios pass, 1 if any fail. The JSON output can be
parsed by CI tooling for dashboards or notifications.

## Scenario File Format

```json
{
  "name": "my-scenario",
  "description": "Custom scenario for CI testing",
  "trace": { ... },
  "expectedFailures": ["FAILED_AUTHORIZATION"],
  "assertions": [
    { "type": "event_order", "params": { "actions": ["BootNotification", "Authorize"] } }
  ]
}
```
