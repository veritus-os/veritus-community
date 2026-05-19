# Checkout System Summary

## Purpose

- monitor student exits safely during school dismissal
- support reception and classroom staff concurrently
- keep every status change auditable

## Current Data Model

- `students`
- `guardians`
- `families`
- `student_guardians`
- `student_checkout_daily`
- `student_checkout_logs`

## Operational Rules

- guardian arrived is a distinct step from classroom release
- final exit requires confirmation
- absent students stay out of the active dismissal board
- conservative family derivation only
