---
'@ocpp-debugkit/core': minor
---

Finalize core package for npm publishing.

- Add `sideEffects: false` for tree-shaking
- Add `files` field to limit published content
- Add `keywords`, `repository`, `homepage`, `bugs` fields for npm discoverability
- Verify barrel export is complete (types, schemas, parser, normalizer, timeline, detection, summarizer, validator, fixtures)
