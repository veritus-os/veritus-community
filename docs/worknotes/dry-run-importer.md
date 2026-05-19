# Worknote: Dry-Run Importer

- Built a workbook reader helper.
- Built a raw importer with dry-run default.
- Dry-run validated all 17 supported files.
- No writes occur unless `--commit` is passed.
- Importer preserves raw payloads and source row numbers.
