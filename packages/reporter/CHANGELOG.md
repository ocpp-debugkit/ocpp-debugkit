# @ocpp-debugkit/reporter

## 0.1.1

### Patch Changes

- 38618c7: Add package READMEs for npm discoverability.
- Updated dependencies [38618c7]
  - @ocpp-debugkit/core@0.1.1

## 0.1.0

### Minor Changes

- 805434f: Create reporter package with Markdown report generator.

  - `generateMarkdownReport()` produces a structured Markdown report with:
    session overview, timeline summary, failures (with severity and suggested
    steps), suggested next steps, and raw event appendix
  - `AnalysisResult` input type representing the analysis pipeline output
  - 11 tests covering structure, failure inclusion, readability, metadata, severity

### Patch Changes

- Updated dependencies [07bca8c]
- Updated dependencies [9543d50]
- Updated dependencies [f2cef5d]
  - @ocpp-debugkit/core@0.1.0
