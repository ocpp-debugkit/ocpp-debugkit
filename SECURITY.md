# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in OCPP DebugKit, please report it
responsibly:

1. **Do not** open a public GitHub issue.
2. Go to [github.com/ocpp-debugkit/ocpp-debugkit/security/advisories/new](https://github.com/ocpp-debugkit/ocpp-debugkit/security/advisories/new)
   and create a private security advisory.
3. Include a description of the vulnerability, steps to reproduce, and
   potential impact.
4. You will receive an acknowledgment within 48 hours.
5. We will investigate and work with you on a fix before any public disclosure.

## Security Considerations

OCPP DebugKit processes untrusted input (trace files, pasted content). The
following security principles are enforced:

- **Input validation** at all external entry points (CLI args, file content,
  paste input in the browser).
- **Safe JSON parsing** — try/catch with size guards on all untrusted input.
- **No dynamic code execution** — no `eval()`, `Function()`, or similar on
  untrusted input.
- **No prototype pollution** — object shapes validated, safe parsing used.
- **Path safety** — file paths validated to prevent path traversal in CLI.
- **Safe rendering** — no `dangerouslySetInnerHTML` or unsafe HTML injection.
- **Browser-local processing** — no automatic uploading of user trace data.
- **Size limits** — file-size and event-count limits enforced on trace input.
- **No secrets in committed files** — no credentials, API keys, or tokens.
- **No sensitive data in committed artifacts** — synthetic data only in
  trace fixtures, sample data, and test data.

## Scope

This policy applies to the OCPP DebugKit codebase, including all packages and
the web application. It does not apply to user-loaded traces or runtime-generated
reports — those contain the user's own data and are processed locally.
