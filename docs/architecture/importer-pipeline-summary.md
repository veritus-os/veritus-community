# Importer Pipeline Summary

## Flow

1. read approved Excel workbook
2. serialize row to canonical JSON payload
3. write traceable raw row into `sponte_raw_*`
4. write validation failures into `import_errors`
5. record batch lifecycle in `import_batches`

## Current Characteristics

- dry-run mode is default
- commit mode writes only to staging tables
- importer currently supports phase-1 source files only
- row hashes are deterministic and file-local duplicate checks are enabled
