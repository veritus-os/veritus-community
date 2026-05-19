# Search Index Fields

Recommended staff-facing search feed for the first VeritusOS global search MVP.

| Source file | Source field | Normalized destination | Why it matters for search |
|---|---|---|---|
| `Alunos.xlsx` | `Nome` | `students.full_name` | Primary search field |
| `Alunos.xlsx` | `CPF` | `students.cpf_digits` | Searchable and dedupe relevant |
| `Alunos.xlsx` | `FoneResidencial` | `students.phone_home_digits` | Searchable phone |
| `Alunos.xlsx` | `FoneCelular` | `students.phone_mobile_digits` | Primary phone search field |
| `Alunos.xlsx` | `Email` | `students.email` | Most rows blank in source |
| `Alunos.xlsx` | `NomeSocial` | `students.social_name` | Secondary search field |
| `Responsaveis.xlsx` | `Nome` | `guardians.full_name` | Primary search field |
| `Responsaveis.xlsx` | `FoneResidencial` | `guardians.phone_home_digits` | Searchable phone |
| `Responsaveis.xlsx` | `FoneCelular` | `guardians.phone_mobile_digits` | Primary phone search field |
| `Responsaveis.xlsx` | `Email` | `guardians.email` | Searchable email |
| `Responsaveis.xlsx` | `CPF` | `guardians.cpf_digits` | Searchable and dedupe relevant |
| `AlunosEmpresas.xlsx` | `SituacaoAlunoID` | `students.current_status` | Primary student status |
| `AlunosEmpresas.xlsx` | `NumeroMatricula` | `students.enrollment_number` | Important search field |
| `AlunosEmpresas.xlsx` | `RA` | `students.academic_registry` | Important search field |
| `Turmas.xlsx` | `Nome` | `classes.name` | Primary search field |
| `Turmas.xlsx` | `Sigla` | `classes.short_name` | Display label |
| `Turmas.xlsx` | `AnoLetivo` | `classes.school_year` | Core filter field |
| `Contratos.xlsx` | `NumeroContrato` | `contracts.contract_number` | Searchable contract number |
| `Contratos.xlsx` | `Situacao` | `contracts.status_code` | Needs Review |
| `ContasReceber.xlsx` | `TipoRecebimentoID` | `charges.payment_type` | Core finance classification |
| `ContasReceber.xlsx` | `Documento` | `charges.document_reference` | Searchable if populated |
| `ContasReceberParcelas.xlsx` | `Situacao` | `charge_installments.status_code` | Needs Review before UI labels |
| `ContasReceberParcelas.xlsx` | `NumeroBoleto` | `charge_installments.bank_slip_number` | Searchable when non-zero |
| `ContasReceberParcelas.xlsx` | `NumeroRecibo` | `charge_installments.receipt_number` | Searchable receipt number |
| `RPS.xlsx` | `NumeroRPS` | `invoices.rps_number` | Searchable invoice field |
| `RPS.xlsx` | `NumeroNF` | `invoices.invoice_number` | Searchable invoice field |
| `RPS.xlsx` | `Status` | `invoices.status_code` | Needs Review |
| `DocumentosPendentesDetalhes.xlsx` | `TipoDocumentoPendenteID` | `student_documents.document_type` | Document type label |
| `DocumentosPendentesDetalhes.xlsx` | `Entregue` | `student_documents.delivered` | Core document status |
| `Anexos.xlsx` | `Arquivo` | `student_documents.file_name` | Displayable attachment name |
| `Anexos.xlsx` | `Descricao` | `student_documents.description` | Free-text context |

## Search Categories

- Student: name, social name, CPF, phone, matrícula, RA, current status
- Guardian: name, CPF, phone, email
- Class: class name, short name, school year
- Enrollment: contract number, enrollment status, class link
- Finance: receipt number, boleto number, payment type, installment status, invoice number
- Documents: pending document type, delivered status, attachment file name

## Search Normalization Rules

- Use accent-insensitive name search via `unaccent` + trigram support.
- Index digits-only CPF and phone helper fields.
- Keep matrícula and RA as text so leading zeros are preserved.
- Promote only normalized labels for status filters once lookup/business review is complete.
