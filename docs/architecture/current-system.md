# Current System Architecture

## App Shape

- React + Vite frontend in `src/`
- Repository pattern with local and Supabase backends
- Supabase used for auth, storage, and staging data
- checkout feature currently lives in the app as a dedicated module

## School Data Layers

- raw/staging Sponte layer for traceable ingestion
- checkout-oriented operational tables for student exit control
- normalized ERP layer still pending for broader school modules

## Checkout Scope

- `students`, `guardians`, `families`
- `student_guardians`
- `student_checkout_daily`, `student_checkout_logs`
- activity/pickup workflows for reception and classroom staff

## Traceability

- approved mapping docs live in `docs/db/`
- staging import docs and scripts are now canonical for import history
- migration history should stay append-only and linear
