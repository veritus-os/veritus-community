# Sponte Source Files

High-value Sponte workbooks approved for the first VeritusOS import contract. All statistics below are read-only and were generated from the original Excel files without modifying them.

| Source file | Sheet | Rows | Cols | Raw table | Primary key | Phase 1 | Purpose | Initial quality notes |
|---|---|---:|---:|---|---|---|---|---|
| `MultiEmpresa.xlsx` | `MultiEmpresa` | `1` | `59` | `sponte_raw_multi_empresa` | `ce` | Yes | School / tenant metadata | No immediate blocking issue detected in selected checks |
| `Alunos.xlsx` | `Alunos` | `760` | `106` | `sponte_raw_alunos` | `AlunoID` | Yes | Student master records | invalid CPF values: 1; invalid date-like values: 2621 |
| `Responsaveis.xlsx` | `Responsaveis` | `915` | `54` | `sponte_raw_responsaveis` | `ResponsavelID` | Yes | Guardian / responsible master records | No immediate blocking issue detected in selected checks |
| `AlunosResponsaveis.xlsx` | `AlunosResponsaveis` | `1264` | `7` | `sponte_raw_alunos_responsaveis` | `AlunoResponsavelID` | Yes | Student-guardian relationship graph | No immediate blocking issue detected in selected checks |
| `AlunosResponsaveisRetirada.xlsx` | `AlunosResponsaveisRetirada` | `10` | `4` | `sponte_raw_alunos_responsaveis_retirada` | `AlunoResponsavelRetiradaID` | Later | Guardian pickup schedule restrictions | No immediate blocking issue detected in selected checks |
| `RetiradaAlunosAPP.xlsx` | `RetiradaAlunosAPP` | `37` | `7` | `sponte_raw_retirada_alunos_app` | `RetiradaAlunoID` | Later | Guardian pickup app events | No immediate blocking issue detected in selected checks |
| `AlunosEmpresas.xlsx` | `AlunosEmpresas` | `760` | `48` | `sponte_raw_alunos_empresas` | `AlunoEmpresaID` | Yes | Student institutional status / matrícula overlay | No immediate blocking issue detected in selected checks |
| `Cursos.xlsx` | `Cursos` | `28` | `63` | `sponte_raw_cursos` | `CursoID` | Yes | Course catalog | invalid date-like values: 87 |
| `Series.xlsx` | `Series` | `19` | `4` | `sponte_raw_series` | `SerieID` | Yes | Series / school stage lookup | No immediate blocking issue detected in selected checks |
| `Turnos.xlsx` | `Turnos` | `4` | `4` | `sponte_raw_turnos` | `TurnoID` | Yes | Shift lookup | No immediate blocking issue detected in selected checks |
| `Salas.xlsx` | `Salas` | `28` | `12` | `sponte_raw_salas` | `SalaID` | Later | Room catalog | invalid date-like values: 56 |
| `Turmas.xlsx` | `Turmas` | `128` | `36` | `sponte_raw_turmas` | `TurmaID` | Yes | Class master records | invalid date-like values: 384 |
| `TurmaAlunos.xlsx` | `TurmaAlunos` | `1400` | `13` | `sponte_raw_turma_alunos` | `TurmaAlunoID` | Yes | Class membership records | No immediate blocking issue detected in selected checks |
| `Contratos.xlsx` | `Contratos` | `1397` | `25` | `sponte_raw_contratos` | `ContratoID` | Yes | Student contract headers | invalid date-like values: 2794 |
| `ContratosTurmas.xlsx` | `ContratosTurmas` | `1399` | `18` | `sponte_raw_contratos_turmas` | `ContratoTurmaID` | Yes | Enrollment / contract-class bridge | No immediate blocking issue detected in selected checks |
| `ContratosPlanos.xlsx` | `ContratosPlanos` | `4695` | `13` | `sponte_raw_contratos_planos` | `ContratoPlanoID` | Yes | Contract to financial charge bridge | No immediate blocking issue detected in selected checks |
| `ContasReceber.xlsx` | `ContasReceber` | `6373` | `42` | `sponte_raw_contas_receber` | `ContaReceberID` | Yes | Financial charge headers | invalid date-like values: 12746 |
| `ContasReceberParcelas.xlsx` | `ContasReceberParcelas` | `33369` | `77` | `sponte_raw_contas_receber_parcelas` | `ContaReceberID+NumeroParcela` | Yes | Financial installment history | invalid date-like values: 66738; invalid money-like values: 23 |
| `RPS.xlsx` | `RPS` | `15341` | `21` | `sponte_raw_rps` | `RPSID` | Later | Invoices / NFSe headers | invalid date-like values: 15341 |
| `RPSParcelas.xlsx` | `RPSParcelas` | `15341` | `3` | `sponte_raw_rps_parcelas` | `RPSID+ContaReceberID+NumeroParcela` | Later | Invoice to installment bridge | No immediate blocking issue detected in selected checks |
| `DocumentosPendentes.xlsx` | `DocumentosPendentes` | `460` | `6` | `sponte_raw_documentos_pendentes` | `DocumentoPendenteID` | Later | Pending student document headers | No immediate blocking issue detected in selected checks |
| `DocumentosPendentesDetalhes.xlsx` | `DocumentosPendentesDetalhes` | `461` | `9` | `sponte_raw_documentos_pendentes_detalhes` | `DocumentoPendenteDetalheID` | Later | Pending document detail/status records | invalid date-like values: 461 |
| `Anexos.xlsx` | `Anexos` | `251` | `9` | `sponte_raw_anexos` | `AnexoID` | Later | Attachment metadata only | invalid date-like values: 251 |

## Lookup Dependencies

| Field | Lookup source file | Why it matters |
|---|---|---|
| `SituacaoAlunoID` | `SituacoesAlunos.xlsx` | Required to decode source code values before app-layer display |
| `SituacaoDidaticaID` | `SituacoesDidaticas.xlsx` | Required to decode source code values before app-layer display |
| `TipoContratoID` | `TiposContrato.xlsx` | Required to decode source code values before app-layer display |
| `TipoDocumentoPendenteID` | `TiposDocumentosPendentes.xlsx` | Required to decode source code values before app-layer display |
| `TipoRecebimentoID` | `TiposRecebimentos.xlsx` | Required to decode source code values before app-layer display |
| `TipoResponsavelID` | `TiposResponsaveis.xlsx` | Required to decode source code values before app-layer display |
