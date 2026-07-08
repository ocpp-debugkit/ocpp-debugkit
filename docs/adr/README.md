# Architecture Decision Records

This directory contains ADRs for OCPP DebugKit. Each ADR documents a
significant architectural decision, its context, and its consequences.

## Index

| ADR | Title | Status |
|-----|-------|--------|
| [ADR-0001](0001-ocpp-version-scope.md) | OCPP Version Scope — 1.6 JSON Primary | Accepted |
| [ADR-0002](0002-input-trace-formats.md) | Input Trace Formats — JSON Object + JSONL | Accepted |
| [ADR-0003](0003-canonical-event-model.md) | Canonical Internal Event Model | Accepted |
| [ADR-0004](0004-message-direction.md) | Message Direction Representation | Accepted |
| [ADR-0005](0005-timestamp-normalization.md) | Timestamp Normalization | Accepted |
| [ADR-0006](0006-session-correlation.md) | Session Correlation Strategy | Accepted |
| [ADR-0007](0007-malformed-trace-handling.md) | Malformed Trace Handling | Accepted |
| [ADR-0008](0008-browser-local-processing.md) | Browser-Local Processing & Privacy | Accepted |
| [ADR-0009](0009-protocol-extensibility.md) | Future Protocol-Version Extensibility | Accepted |
| [ADR-0010](0010-single-package-consolidation.md) | Single Package Consolidation | Accepted |

## Format

Each ADR follows:

```
# ADR-NNNN: Title

## Status
Accepted | Superseded by ADR-XXXX | Deprecated

## Context
Why this decision was needed.

## Decision
What was decided.

## Consequences
What follows from this decision.
```
