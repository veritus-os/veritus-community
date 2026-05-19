# Sponte Import Rules

## Raw / Staging Rules

- Every approved source workbook gets its own `sponte_raw_*` table.
- Preserve original source IDs exactly.
- Preserve each approved source column as a dedicated raw column using snake_case names.
- Also store the entire source row in `raw_payload` JSONB for replay and traceability.
- Every raw row must include `import_batch_id`, `source_file_name`, `source_sheet_name`, `source_row_number`, `imported_at`, and `raw_payload`.
- Raw scalar columns should prefer text-preserving types unless a staging-typed variant is explicitly justified later.

## Normalization Rules

- Normalize CPF and phone searches with digits-only helper fields.
- Normalize dates from Excel to ISO `date` or `timestamp` fields.
- Treat `0`, blank, and obvious sentinels as nullable where the source relationship is optional.
- Decode lookup IDs through source lookup files before staff-facing display.
- Do not derive families aggressively; keep family derivation auditable and reviewable.
- Keep non-student finance rows (`AlunoID = 0`) in raw and normalized finance only; do not force them into student profiles.

## Raw-Only / Excluded From App Layer

- Legacy auth fields: `Senha*`, `Salt`, `Login*`, token-style fields
- Payment-provider internals: `Stone`, `SpontePay`, `PagSeguro`, `Educbank`, `Vindi`, QR code, raw integration identifiers
- Binary/blob placeholders and artifact references: `Conteudo`, `Foto*`, `Imagem*`, `*Path`, curriculum blobs
- Technical source flags that are not yet understood: `RecordValue`, low-confidence sync fields, CRM/Lex linkage fields

## Lookup / Enum Decode Requirements

| Source field | Lookup file | Notes |
|---|---|---|
| `SituacaoAlunoID` | `SituacoesAlunos.xlsx` | Decode before app-layer labels; keep original code as traceable source value |
| `SituacaoDidaticaID` | `SituacoesDidaticas.xlsx` | Decode before app-layer labels; keep original code as traceable source value |
| `TipoContratoID` | `TiposContrato.xlsx` | Decode before app-layer labels; keep original code as traceable source value |
| `TipoDocumentoPendenteID` | `TiposDocumentosPendentes.xlsx` | Decode before app-layer labels; keep original code as traceable source value |
| `TipoRecebimentoID` | `TiposRecebimentos.xlsx` | Decode before app-layer labels; keep original code as traceable source value |
| `TipoResponsavelID` | `TiposResponsaveis.xlsx` | Decode before app-layer labels; keep original code as traceable source value |

## Search Feed Rules

- Search should use normalized helper fields, not raw workbook columns directly.
- CPF search uses digits-only matching.
- Phone search uses digits-only matching.
- Name search must be accent-insensitive and partial-match friendly.
- Enrollment number, RA, contract number, receipt number, RPS/NF number, class name, and document/payment status should be indexed in the search layer.
