# Supabase Structure Summary

## Present In Current Repo

- core app schema migrations
- checkout tables and policies
- raw/staging Sponte import layer
- import tracking tables
- admin platform tables

## Not Yet Present

- normalized campus/class master data for the full ERP
- checkout normalization tables
- global search views
- importer-driven normalized sync

## Important Notes

- migration history has been repaired to allow the new staging migrations to apply cleanly
- `env` files remain gitignored
