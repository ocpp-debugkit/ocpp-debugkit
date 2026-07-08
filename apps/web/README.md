# OCPP DebugKit — Web App

The web front-end for [OCPP DebugKit](https://github.com/ocpp-debugkit/ocpp-debugkit),
a DevTools project for debugging OCPP charging session traces.

This is a [Next.js](https://nextjs.org) app (App Router) using Tailwind CSS. It
is the only app in the monorepo and hosts the landing page, trace inspector,
and documentation.

## Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page — hero, features, architecture, quick start |
| `/inspector` | Trace inspector — paste/upload a trace, view timeline, failures, export report |
| `/docs` | Documentation — quickstart, glossary, architecture, trace format, CLI reference, scenarios |

## Architecture

All trace processing happens client-side in the browser — no trace data is
uploaded to a server. The app uses workspace dependencies on
`@ocpp-debugkit/toolkit` for parsing, analysis, and report generation.

## Development

```bash
# From the monorepo root
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Testing

Playwright E2E smoke tests cover the landing page, navigation, and inspector
flows:

```bash
# From apps/web
pnpm exec playwright install --with-deps chromium
pnpm test:e2e
```

## License

Apache 2.0 — see the [monorepo LICENSE](../../LICENSE).
