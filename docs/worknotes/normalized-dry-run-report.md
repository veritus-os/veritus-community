# Normalized Checkout Dry Run

## Transformer Strategy
- Read only from validated raw staging tables for students, guardians, explicit student-guardian links, classes, and class memberships.
- Simulate normalized output for `campuses`, `student_guardians`, `classes`, and `class_memberships` without writing any normalized rows.
- Keep all decisions traceable through `source_table`, `source_id`, `raw_row_id`, `raw_payload_hash`, and `source_import_batch_id`.

## Normalization Assumptions
- Family derivation stays conservative and uses only explicit student-guardian links.
- Campus assignment is manual-only for the checkout MVP.
- Relationship type and didactic status decoding will be handled later through lookup tables.
- Missing or ambiguous pickup flags are review items, not automatic write blockers for the dry-run report.

## Current Review Risks
- Students without linked guardians.
- Guardians without linked students.
- Student-guardian rows with unclear pickup authorization or relationship type codes.
- Class rows missing campus assignment context.
- Membership rows missing class or student references.

## Readiness For First Normalized Commit Import
- The schema is ready for a dry-run transformer and normalization validation.
- The first commit import should stay blocked until review candidates are resolved and lookup decoding is defined.
- No normalized rows should be written until the dry-run report is stable across the current raw batch.
