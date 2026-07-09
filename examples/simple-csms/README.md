# Simple CSMS Example

Demonstrates how a CSMS mock could use @ocpp-debugkit/toolkit to validate
incoming traces and check for failures.

## Run

```bash
npm install
npm start
```

## What it does

1. Parses a trace with validation issues
2. Validates each OCPP message structurally
3. Detects failures
4. Reports validation errors and detected failures
