# Sponte Raw / Staging Layer

## Scope

This layer exists only for traceable ingestion.

Implemented here:
- `import_batches`
- `import_errors`
- `sponte_raw_*` phase-1 tables
- raw-row metadata, join-key indexes, and RLS

Not implemented here:
- real XLSX importer
- row-hash generation strategy
- normalized Veritus tables
- lookup decoding
- family derivation
- search views or UI

## Table Groups

### Import tracking

- `import_batches`
  - one row per ingestion run
  - tracks source path, file count, status, timestamps, notes, creator, metadata
- `import_errors`
  - row-level validation or ingestion failures
  - linked to `import_batches`
  - stores original raw payload for replay/debug

### Raw phase-1 tables

- `sponte_raw_multi_empresa`
- `sponte_raw_alunos`
- `sponte_raw_responsaveis`
- `sponte_raw_alunos_responsaveis`
- `sponte_raw_alunos_empresas`
- `sponte_raw_cursos`
- `sponte_raw_series`
- `sponte_raw_turnos`
- `sponte_raw_salas`
- `sponte_raw_turmas`
- `sponte_raw_turma_alunos`
- `sponte_raw_contratos`
- `sponte_raw_contratos_turmas`
- `sponte_raw_contas_receber`
- `sponte_raw_contas_receber_parcelas`
- `sponte_raw_rps`
- `sponte_raw_rps_parcelas`

Each raw table stores:
- internal UUID `id`
- `import_batch_id`
- `source_file`
- `source_sheet`
- `source_row_number`
- source join keys or primary IDs where useful
- `raw_payload jsonb`
- `row_hash`
- `imported_at`

## Import Batch Lifecycle

1. create `import_batches` row with `pending` or `running`
2. importer reads workbook rows
3. each accepted row is written to one `sponte_raw_*` table with original values preserved in `raw_payload`
4. each rejected row writes an `import_errors` record with file, row number, error type, and raw payload
5. batch finishes as:
   - `completed`
   - `completed_with_errors`
   - `failed`
   - `cancelled`

## Security Notes

- raw staging is not app-facing
- no anon policies
- authenticated access is restricted to admin-like roles through `public.can_manage_sponte_staging()`
- service role has full access for controlled ingestion jobs
- search/profile features must use normalized tables or views later, never raw staging

## Current Assumptions

- source IDs used for indexes are the minimum set needed for phase-1 joins and validation
- `row_hash` is nullable at the database level; the importer now computes it deterministically for each extracted row
- source values are preserved canonically in `raw_payload`; scalar helper columns are only for traceability and indexing

## Running The Importer

Dry-run only:

```bash
node scripts/importers/sponte/import-raw.js /Users/aleffemanuel/Downloads/Extracao_72776_7291 --dry-run
```

Commit to raw staging:

```bash
SUPABASE_URL=https://YOUR_PROJECT.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key \
node scripts/importers/sponte/import-raw.js /path/to/Extracao_72776_7291 --commit
```

Optional:

```bash
node scripts/importers/sponte/import-raw.js /path/to/Extracao_72776_7291 --commit --created-by <profile-uuid>
```

## Required Environment

- `python3`
- Python package: `openpyxl`
- For commit mode only:
  - `SUPABASE_URL` or `VITE_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

## Current Limitations

- commit mode writes only to `import_batches`, `import_errors`, and `sponte_raw_*`
- no normalized writes, no upserts, no deletes, no truncation
- duplicate row-hash detection is file-local only
- `row_hash` is derived from canonical JSON serialization of the extracted row payload
- workbook values are preserved as JSON-serializable values; Excel-specific formatting metadata is not stored
