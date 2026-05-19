# ADR: Raw Staging Layer

## Decision

Keep a raw/staging layer for Sponte before any normalized import.

## Reason

- preserves source fidelity
- provides import traceability
- allows import dry-runs and replay
- isolates source churn from app tables
