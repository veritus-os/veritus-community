# ADR: Delay Normalized Import

## Decision

Delay normalized import until checkout scope is validated against raw staging.

## Reason

- reduces blast radius
- avoids premature schema design
- keeps checkout MVP smaller and safer
