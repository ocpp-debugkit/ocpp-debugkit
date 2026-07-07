---
'@ocpp-debugkit/reporter': minor
---

Create reporter package with Markdown report generator.

- `generateMarkdownReport()` produces a structured Markdown report with:
  session overview, timeline summary, failures (with severity and suggested
  steps), suggested next steps, and raw event appendix
- `AnalysisResult` input type representing the analysis pipeline output
- 11 tests covering structure, failure inclusion, readability, metadata, severity
