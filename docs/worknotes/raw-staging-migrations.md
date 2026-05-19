# Worknote: Raw Staging Migrations

- Added import tracking tables.
- Added raw staging tables for phase-1 Sponte files.
- Added indexes on source IDs, batch IDs, and row hashes.
- Applied RLS that keeps raw data admin/service-only.
- Fixed migration-history issues during Supabase push.
