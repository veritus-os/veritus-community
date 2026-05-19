#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'


const SUPPORTED_FILES = [
  {
    fileName: 'MultiEmpresa.xlsx',
    rawTable: 'sponte_raw_multi_empresa',
    requiredColumns: ['ce'],
    indexedFields: { ce: 'ce' },
  },
  {
    fileName: 'Alunos.xlsx',
    rawTable: 'sponte_raw_alunos',
    requiredColumns: ['AlunoID'],
    indexedFields: {
      AlunoID: 'aluno_id',
      ResponsavelFinanceiroID: 'responsavel_financeiro_id',
      ResponsavelDidaticoID: 'responsavel_didatico_id',
    },
  },
  {
    fileName: 'Responsaveis.xlsx',
    rawTable: 'sponte_raw_responsaveis',
    requiredColumns: ['ResponsavelID'],
    indexedFields: { ResponsavelID: 'responsavel_id' },
  },
  {
    fileName: 'AlunosResponsaveis.xlsx',
    rawTable: 'sponte_raw_alunos_responsaveis',
    requiredColumns: ['AlunoResponsavelID', 'AlunoID', 'ResponsavelID'],
    indexedFields: {
      AlunoResponsavelID: 'aluno_responsavel_id',
      AlunoID: 'aluno_id',
      ResponsavelID: 'responsavel_id',
      TipoResponsavelID: 'tipo_responsavel_id',
    },
  },
  {
    fileName: 'AlunosEmpresas.xlsx',
    rawTable: 'sponte_raw_alunos_empresas',
    requiredColumns: ['AlunoEmpresaID', 'AlunoID'],
    indexedFields: {
      AlunoEmpresaID: 'aluno_empresa_id',
      AlunoID: 'aluno_id',
      ce: 'ce',
    },
  },
  {
    fileName: 'Cursos.xlsx',
    rawTable: 'sponte_raw_cursos',
    requiredColumns: ['CursoID'],
    indexedFields: {
      CursoID: 'curso_id',
      SerieID: 'serie_id',
    },
  },
  {
    fileName: 'Series.xlsx',
    rawTable: 'sponte_raw_series',
    requiredColumns: ['SerieID'],
    indexedFields: { SerieID: 'serie_id' },
  },
  {
    fileName: 'Turnos.xlsx',
    rawTable: 'sponte_raw_turnos',
    requiredColumns: ['TurnoID'],
    indexedFields: { TurnoID: 'turno_id' },
  },
  {
    fileName: 'Salas.xlsx',
    rawTable: 'sponte_raw_salas',
    requiredColumns: ['SalaID'],
    indexedFields: { SalaID: 'sala_id' },
  },
  {
    fileName: 'Turmas.xlsx',
    rawTable: 'sponte_raw_turmas',
    requiredColumns: ['TurmaID'],
    indexedFields: {
      TurmaID: 'turma_id',
      CursoID: 'curso_id',
      TurnoID: 'turno_id',
      SalaID: 'sala_id',
    },
  },
  {
    fileName: 'TurmaAlunos.xlsx',
    rawTable: 'sponte_raw_turma_alunos',
    requiredColumns: ['TurmaAlunoID', 'TurmaID', 'AlunoID'],
    indexedFields: {
      TurmaAlunoID: 'turma_aluno_id',
      TurmaID: 'turma_id',
      AlunoID: 'aluno_id',
      SituacaoDidaticaID: 'situacao_didatica_id',
    },
  },
  {
    fileName: 'Contratos.xlsx',
    rawTable: 'sponte_raw_contratos',
    requiredColumns: ['ContratoID', 'AlunoID'],
    indexedFields: {
      ContratoID: 'contrato_id',
      AlunoID: 'aluno_id',
      ResponsavelID: 'responsavel_id',
      TipoContratoID: 'tipo_contrato_id',
    },
  },
  {
    fileName: 'ContratosTurmas.xlsx',
    rawTable: 'sponte_raw_contratos_turmas',
    requiredColumns: ['ContratoTurmaID', 'ContratoID', 'TurmaID'],
    indexedFields: {
      ContratoTurmaID: 'contrato_turma_id',
      ContratoID: 'contrato_id',
      TurmaID: 'turma_id',
    },
  },
  {
    fileName: 'ContasReceber.xlsx',
    rawTable: 'sponte_raw_contas_receber',
    requiredColumns: ['ContaReceberID'],
    indexedFields: {
      ContaReceberID: 'conta_receber_id',
      AlunoID: 'aluno_id',
      TipoRecebimentoID: 'tipo_recebimento_id',
    },
  },
  {
    fileName: 'ContasReceberParcelas.xlsx',
    rawTable: 'sponte_raw_contas_receber_parcelas',
    requiredColumns: ['ContaReceberID', 'NumeroParcela'],
    indexedFields: {
      ContaReceberID: 'conta_receber_id',
      NumeroParcela: 'numero_parcela',
      Situacao: 'situacao',
    },
  },
  {
    fileName: 'RPS.xlsx',
    rawTable: 'sponte_raw_rps',
    requiredColumns: ['RPSID'],
    indexedFields: { RPSID: 'rps_id' },
  },
  {
    fileName: 'RPSParcelas.xlsx',
    rawTable: 'sponte_raw_rps_parcelas',
    requiredColumns: ['RPSID', 'ContaReceberID', 'NumeroParcela'],
    indexedFields: {
      RPSID: 'rps_id',
      ContaReceberID: 'conta_receber_id',
      NumeroParcela: 'numero_parcela',
    },
  },
]

const CHUNK_SIZE = 200

function parseArgs(argv) {
  const args = {
    exportDir: null,
    commit: false,
    dryRun: true,
    createdBy: process.env.SPONTE_IMPORT_CREATED_BY ?? null,
    sourceSystem: 'sponte',
  }

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (token === '--commit') {
      args.commit = true
      args.dryRun = false
    } else if (token === '--dry-run') {
      args.dryRun = true
      args.commit = false
    } else if (token === '--created-by') {
      args.createdBy = argv[index + 1] ?? null
      index += 1
    } else if (token === '--source-system') {
      args.sourceSystem = argv[index + 1] ?? args.sourceSystem
      index += 1
    } else if (!args.exportDir) {
      args.exportDir = token
    } else {
      throw new Error(`Unknown argument: ${token}`)
    }
  }

  if (!args.exportDir) {
    throw new Error('Usage: node scripts/importers/sponte/import-raw.js <export-dir> [--dry-run|--commit] [--created-by <uuid>]')
  }

  return args
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(',')}]`
  }

  const keys = Object.keys(value).sort()
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`
}

function computeRowHash(rawPayload) {
  return crypto.createHash('sha256').update(stableStringify(rawPayload)).digest('hex')
}

function normalizeInteger(value) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value)

  const cleaned = String(value).trim()
  if (!cleaned) return null
  if (!/^-?\d+$/.test(cleaned)) return null
  return Number.parseInt(cleaned, 10)
}

function buildRawRow(config, workbookData, row) {
  const rawRecord = {
    import_batch_id: null,
    source_file: config.fileName,
    source_sheet: workbookData.sheet_name,
    source_row_number: row.source_row_number,
    raw_payload: row.raw_payload,
    row_hash: computeRowHash(row.raw_payload),
  }

  for (const [sourceField, destinationField] of Object.entries(config.indexedFields)) {
    rawRecord[destinationField] = normalizeInteger(row.raw_payload[sourceField])
  }

  return rawRecord
}

function readWorkbook(filePath) {
  const helperPath = path.resolve('scripts/importers/sponte/read_workbook.py')
  const result = spawnSync('python3', [helperPath, filePath], {
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 512,
  })

  if (result.status !== 0) {
    const detail = result.stderr?.trim() || result.stdout?.trim() || `reader failed with exit code ${result.status}`
    throw new Error(detail)
  }

  return JSON.parse(result.stdout)
}

function buildSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Commit mode requires SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY')
  }

  return {
    url: supabaseUrl.replace(/\/$/, ''),
    key: serviceRoleKey,
  }
}

async function postgrestRequest(client, method, table, body, query = '') {
  const response = await fetch(`${client.url}/rest/v1/${encodeURIComponent(table)}${query}`, {
    method,
    headers: {
      apikey: client.key,
      Authorization: `Bearer ${client.key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await response.text()
  const payload = text ? JSON.parse(text) : null

  if (!response.ok) {
    const message = Array.isArray(payload) ? JSON.stringify(payload) : payload?.message || response.statusText
    const error = new Error(message)
    error.status = response.status
    error.payload = payload
    throw error
  }

  return payload
}

async function insertChunk(client, table, rows) {
  try {
    await postgrestRequest(client, 'POST', table, rows)
    return []
  } catch (error) {
    const rowErrors = []
    for (const row of rows) {
      try {
        await postgrestRequest(client, 'POST', table, row)
      } catch (rowError) {
        rowErrors.push({
          row,
          errorType: 'insert_failed',
          errorMessage: rowError.message,
        })
      }
    }
    return rowErrors
  }
}

async function flushImportErrors(client, importBatchId, pendingErrors) {
  if (!pendingErrors.length) return

  const rows = pendingErrors.map((entry) => ({
    import_batch_id: importBatchId,
    source_file: entry.sourceFile,
    source_row_number: entry.sourceRowNumber ?? null,
    source_table: entry.sourceTable ?? null,
    error_type: entry.errorType,
    error_message: entry.errorMessage,
    raw_payload: entry.rawPayload ?? {},
  }))

  for (let index = 0; index < rows.length; index += CHUNK_SIZE) {
    const chunk = rows.slice(index, index + CHUNK_SIZE)
    const { error } = await client.from('import_errors').insert(chunk)
    if (error) {
      throw new Error(`failed to write import_errors: ${error.message}`)
    }
  }
}

async function createImportBatch(client, args, sourceFileCount) {
  const payload = {
    source_system: args.sourceSystem,
    source_path: path.resolve(args.exportDir),
    source_file_count: sourceFileCount,
    status: 'running',
    created_by: args.createdBy,
    metadata: {
      mode: 'raw_staging',
      commit: true,
      supported_files: SUPPORTED_FILES.map((entry) => entry.fileName),
    },
  }

  const data = await postgrestRequest(client, 'POST', 'import_batches', payload)
  return data?.[0]?.id ?? data?.id
}

async function finalizeImportBatch(client, importBatchId, status, summary) {
  await postgrestRequest(
    client,
    'PATCH',
    'import_batches',
    {
      status,
      completed_at: new Date().toISOString(),
      metadata: summary,
    },
    `?id=eq.${encodeURIComponent(importBatchId)}`
  )
}

function printSummary(summary) {
  if (summary.batchId) {
    console.log(`batch_id: ${summary.batchId}`)
  }
  console.log(`mode: ${summary.mode}`)
  console.log(`files_processed: ${summary.filesProcessed}`)
  console.log(`total_rows: ${summary.totalRows}`)
  console.log(`total_inserted: ${summary.totalInserted}`)
  console.log(`total_errors: ${summary.totalErrors}`)
  console.log(`skipped_files: ${summary.skippedFiles.join(', ') || '-'}`)
  console.log('')

  for (const file of summary.files) {
    console.log(
      [
        file.fileName,
        `rows_read=${file.rowsRead}`,
        `rows_inserted=${file.rowsInserted}`,
        `errors=${file.errors}`,
        `status=${file.status}`,
      ].join(' | ')
    )
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const exportDir = path.resolve(args.exportDir)
  const summary = {
    batchId: null,
    mode: args.commit ? 'commit' : 'dry-run',
    filesProcessed: 0,
    totalRows: 0,
    totalInserted: 0,
    totalErrors: 0,
    skippedFiles: [],
    files: [],
  }

  const client = args.commit ? buildSupabaseClient() : null
  const pendingImportErrors = []
  let importBatchId = null

  if (args.commit) {
    importBatchId = await createImportBatch(client, args, SUPPORTED_FILES.length)
    summary.batchId = importBatchId
  }

  try {
    for (const config of SUPPORTED_FILES) {
      const filePath = path.join(exportDir, config.fileName)
      const fileSummary = {
        fileName: config.fileName,
        rowsRead: 0,
        rowsInserted: 0,
        errors: 0,
        status: 'processed',
      }

      if (!fs.existsSync(filePath)) {
        fileSummary.status = 'missing'
        fileSummary.errors += 1
        summary.skippedFiles.push(config.fileName)
        pendingImportErrors.push({
          sourceFile: config.fileName,
          sourceTable: config.rawTable,
          errorType: 'missing_file',
          errorMessage: `file not found: ${filePath}`,
          rawPayload: {},
        })
        summary.files.push(fileSummary)
        continue
      }

      let workbookData
      try {
        workbookData = readWorkbook(filePath)
      } catch (error) {
        fileSummary.status = 'read_failed'
        fileSummary.errors += 1
        pendingImportErrors.push({
          sourceFile: config.fileName,
          sourceTable: config.rawTable,
          errorType: 'read_failed',
          errorMessage: error.message,
          rawPayload: {},
        })
        summary.files.push(fileSummary)
        continue
      }

      if (!workbookData.sheet_name) {
        fileSummary.status = 'invalid_workbook'
        fileSummary.errors += 1
        pendingImportErrors.push({
          sourceFile: config.fileName,
          sourceTable: config.rawTable,
          errorType: 'missing_sheet',
          errorMessage: 'workbook has no readable sheet',
          rawPayload: {},
        })
        summary.files.push(fileSummary)
        continue
      }

      for (const requiredColumn of config.requiredColumns) {
        if (!workbookData.headers.includes(requiredColumn)) {
          fileSummary.status = 'invalid_headers'
          fileSummary.errors += 1
          pendingImportErrors.push({
            sourceFile: config.fileName,
            sourceTable: config.rawTable,
            errorType: 'missing_required_column',
            errorMessage: `missing required column: ${requiredColumn}`,
            rawPayload: { headers: workbookData.headers },
          })
        }
      }

      if (fileSummary.status === 'invalid_headers') {
        summary.files.push(fileSummary)
        continue
      }

      const seenHashes = new Set()
      const rowsToInsert = []

      for (const row of workbookData.rows) {
        fileSummary.rowsRead += 1
        summary.totalRows += 1

        try {
          JSON.stringify(row.raw_payload)
        } catch (error) {
          fileSummary.errors += 1
          pendingImportErrors.push({
            sourceFile: config.fileName,
            sourceRowNumber: row.source_row_number,
            sourceTable: config.rawTable,
            errorType: 'json_serialization_failed',
            errorMessage: error.message,
            rawPayload: {},
          })
          continue
        }

        const rawRow = buildRawRow(config, workbookData, row)

        for (const requiredColumn of config.requiredColumns) {
          if (rawRow.raw_payload[requiredColumn] === null || rawRow.raw_payload[requiredColumn] === undefined || rawRow.raw_payload[requiredColumn] === '') {
            fileSummary.errors += 1
            pendingImportErrors.push({
              sourceFile: config.fileName,
              sourceRowNumber: row.source_row_number,
              sourceTable: config.rawTable,
              errorType: 'missing_required_id_value',
              errorMessage: `missing required value for ${requiredColumn}`,
              rawPayload: rawRow.raw_payload,
            })
          }
        }

        if (seenHashes.has(rawRow.row_hash)) {
          fileSummary.errors += 1
          pendingImportErrors.push({
            sourceFile: config.fileName,
            sourceRowNumber: row.source_row_number,
            sourceTable: config.rawTable,
            errorType: 'duplicate_row_hash_in_file',
            errorMessage: `duplicate row_hash detected in ${config.fileName}`,
            rawPayload: rawRow.raw_payload,
          })
        } else {
          seenHashes.add(rawRow.row_hash)
        }

        rowsToInsert.push(rawRow)
      }

      if (args.commit) {
        for (let index = 0; index < rowsToInsert.length; index += CHUNK_SIZE) {
          const chunk = rowsToInsert.slice(index, index + CHUNK_SIZE).map((row) => ({
            ...row,
            import_batch_id: importBatchId,
          }))

          const rowErrors = await insertChunk(client, config.rawTable, chunk)
          fileSummary.rowsInserted += chunk.length - rowErrors.length
          for (const rowError of rowErrors) {
            fileSummary.errors += 1
            pendingImportErrors.push({
              sourceFile: config.fileName,
              sourceRowNumber: rowError.row.source_row_number,
              sourceTable: config.rawTable,
              errorType: rowError.errorType,
              errorMessage: rowError.errorMessage,
              rawPayload: rowError.row.raw_payload,
            })
          }
        }
      } else {
        fileSummary.rowsInserted = 0
      }

      summary.filesProcessed += 1
      summary.totalInserted += fileSummary.rowsInserted
      summary.files.push(fileSummary)
    }

    summary.totalErrors = summary.files.reduce((count, file) => count + file.errors, 0)

    if (args.commit) {
      await flushImportErrors(client, importBatchId, pendingImportErrors)
      await finalizeImportBatch(
        client,
        importBatchId,
        summary.totalErrors > 0 ? 'completed_with_errors' : 'completed',
        {
          mode: 'raw_staging',
          files_processed: summary.filesProcessed,
          total_rows: summary.totalRows,
          total_inserted: summary.totalInserted,
          total_errors: summary.totalErrors,
          skipped_files: summary.skippedFiles,
        }
      )
    }
  } catch (error) {
    if (args.commit && client && importBatchId) {
      await flushImportErrors(client, importBatchId, pendingImportErrors).catch(() => {})
      await finalizeImportBatch(client, importBatchId, 'failed', {
        mode: 'raw_staging',
        failure: error.message,
      }).catch(() => {})
    }
    throw error
  }

  printSummary(summary)
}

main().catch((error) => {
  console.error(`import failed: ${error.message}`)
  process.exit(1)
})
