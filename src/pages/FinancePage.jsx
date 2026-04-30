import { useEffect, useMemo, useState } from 'react'
import { ChevronRight, ChevronDown, Plus } from 'lucide-react'
import AppShell from '../components/AppShell'
import ClearFiltersButton from '../components/ClearFiltersButton'
import PaginationControls from '../components/PaginationControls'
import { ErrorBox, LoadingRow } from '../components/UiState'
import { schoolCrudService, financialService, contractService, reconciliationService, recurringTransactionService } from '../core/services/repositoryRegistry'
import { downloadCsv, downloadExcelLike } from '../lib/exportUtils'
import { useRole } from '../core/auth/roleContext'
import { useEntityInfo } from '../components/EntityInfoDock'
import DateFilter from '../components/DateFilter'
import { buildCategoryTree } from '../core/data/financialRecordAccounts'

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const SCHOLARSHIP_TYPES = ['desconto comercial', 'SAES', 'SINPRO']

const sectionItems = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'parcelas', label: 'Parcelas / Mensalidades' },
  { key: 'inadimplentes', label: 'Inadimplentes' },
  { key: 'bolsas', label: 'Bolsas / Descontos' },
  { key: 'extrato', label: 'Extrato / Caixa' },
  { key: 'busca', label: 'Busca por Aluno' },
  { key: 'contratos', label: 'Contratos' },
  { key: 'conciliacao', label: 'Conciliação' },
  { key: 'recorrencias', label: 'Recorrências' },
  { key: 'plano_contas', label: 'Plano de Contas' },
]

const defaultInstallmentFilters = {
  payment_status: 'todos',
  payment_method: 'todos',
  reference_month: 'todos',
  student_id: 'todos',
  family_id: 'todos',
}

const defaultInadimplenteFilters = {
  payment_status: 'todos',
  family_id: 'todos',
  student_id: 'todos',
  responsible_id: 'todos',
}

const defaultScholarshipFilters = {
  scholarship_type: 'todos',
  payment_status: 'todos',
}

const defaultCashFilters = {
  reference_month: 'todos',
  movement_status: 'todos',
}

function paymentMethodLabel(method) {
  if (method === 'pix') return 'PIX'
  if (method === 'card') return 'Cartão'
  if (method === 'cash') return 'Dinheiro'
  return 'Boleto'
}

function paymentStatusLabel(status) {
  if (status === 'paid') return 'Pago'
  if (status === 'overdue') return 'Inadimplente'
  if (status === 'cancelled') return 'Cancelado'
  if (status === 'conciliated') return 'Conciliado'
  if (status === 'renegotiated') return 'Renegociado'
  return 'Pendente'
}

function statusClass(status) {
  if (status === 'paid') return 'bg-emerald-50 text-emerald-700'
  if (status === 'overdue') return 'bg-rose-50 text-rose-700'
  if (status === 'cancelled') return 'bg-slate-100 text-slate-500 line-through'
  if (status === 'conciliated') return 'bg-sky-50 text-sky-700'
  if (status === 'renegotiated') return 'bg-purple-50 text-purple-700'
  return 'bg-amber-50 text-amber-700'
}

function flowTypeLabel(value) {
  return value === 'saída' ? 'Saída' : 'Entrada'
}

function flowTypeClass(value) {
  return value === 'saída' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
}

function paginateRows(rows, page, pageSize) {
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paginatedRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  return { totalPages, currentPage, paginatedRows }
}


export default function FinancePage() {
  const [rows, setRows] = useState([])
  const [summary, setSummary] = useState(null)
  const [students, setStudents] = useState([])
  const [families, setFamilies] = useState([])
  const [responsibles, setResponsibles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeSection, setActiveSection] = useState('dashboard')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [dateFilter, setDateFilter] = useState({ preset: 'todo', from: null, to: null })

  const [installmentFilters, setInstallmentFilters] = useState(defaultInstallmentFilters)
  const [inadimplenteFilters, setInadimplenteFilters] = useState(defaultInadimplenteFilters)
  const [scholarshipFilters, setScholarshipFilters] = useState(defaultScholarshipFilters)
  const [cashFilters, setCashFilters] = useState(defaultCashFilters)

  const [studentQuery, setStudentQuery] = useState('')
  const [studentStatement, setStudentStatement] = useState(null)
  const [statementLoading, setStatementLoading] = useState(false)

  const [auditRows, setAuditRows] = useState([])
  const [auditRecordId, setAuditRecordId] = useState(null)
  const [auditFromDate, setAuditFromDate] = useState('')
  const [auditToDate, setAuditToDate] = useState('')

  const [categories, setCategories] = useState([])
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCatCode, setNewCatCode] = useState('')
  const [newCatName, setNewCatName] = useState('')
  const [newCatParent, setNewCatParent] = useState('')
  const [newCatType, setNewCatType] = useState('expense')

  const [contracts, setContracts] = useState([])
  const [showAddContract, setShowAddContract] = useState(false)
  const [bankStatements, setBankStatements] = useState([])
  const [matchResult, setMatchResult] = useState(null)
  const [statementInput, setStatementInput] = useState('')

  const [recurringTemplates, setRecurringTemplates] = useState([])
  const [showAddRecurring, setShowAddRecurring] = useState(false)
  const [recurringForm, setRecurringForm] = useState({
    description: '', amount: '', cash_flow_type: 'saída', due_day: '10', notes: '',
  })
  const [contractForm, setContractForm] = useState({
    family_id: '', student_id: '', service_type: 'mensalidade',
    description: '', amount_per_installment: '', installment_count: '12',
    due_day: '10', start_month: new Date().toISOString().slice(0, 7),
    category_code: '', notes: '',
  })

  const [periodLockDate, setPeriodLockDate] = useState('')
  const [lockInput, setLockInput] = useState('')

  const { role } = useRole()
  const { openFamilyInfo, openStudentInfo } = useEntityInfo()

  async function loadData() {
    try {
      setLoading(true)
      setError('')
      const [financialRows, summaryRows, studentRows, familyRows, categoryRows, contractRows] = await Promise.all([
        schoolCrudService.listFinancialRecords(),
        schoolCrudService.getFinancialSummary(),
        schoolCrudService.listStudents(),
        schoolCrudService.listFamiliesDetailed(),
        schoolCrudService.listCategories(),
        contractService.listContracts(),
      ])
      setRows(financialRows)
      setSummary(summaryRows)
      setStudents(studentRows)
      setFamilies(familyRows)
      setResponsibles(familyRows.map((item) => item.responsible).filter(Boolean))
      setCategories(categoryRows)
      setContracts(contractRows)
      setBankStatements(await reconciliationService.listStatements())
      setRecurringTemplates(await recurringTransactionService.listTemplates())
      const lockDate = financialService.getPeriodLockDate() || ''
      setPeriodLockDate(lockDate)
      setLockInput(lockDate)
      setPage(1)
    } catch (err) {
      setError(err.message ?? 'Não foi possível carregar o módulo financeiro.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    setPage(1)
  }, [activeSection])

  const monthOptions = useMemo(() => {
    const values = [...new Set(rows.map((item) => item.reference_month).filter(Boolean))]
    return values.sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [rows])

  const scholarshipTypeOptions = useMemo(() => {
    const values = [...new Set(rows.map((item) => item.scholarship_type).filter(Boolean))]
    return [...new Set([...SCHOLARSHIP_TYPES, ...values])].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [rows])

  const financialTrendRows = useMemo(() => {
    const grouped = new Map()
    rows
      .filter((item) => item.cash_flow_type === 'entrada')
      .forEach((item) => {
        const month = String(item.reference_month || '').slice(0, 7)
        if (!month) return
        const current = grouped.get(month) || { month, previsto: 0, pago: 0, pendente: 0, inadimplente: 0 }
        const amount = Number(item.amount || 0)
        current.previsto += amount
        if (item.payment_status === 'paid') current.pago += amount
        if (item.payment_status === 'pending') current.pendente += amount
        if (item.payment_status === 'overdue') current.inadimplente += amount
        grouped.set(month, current)
      })
    return [...grouped.values()].sort((a, b) => a.month.localeCompare(b.month, 'pt-BR'))
  }, [rows])

  const installmentRows = useMemo(() => {
    return rows
      .filter((item) => item.cash_flow_type === 'entrada')
      .filter((item) =>
        installmentFilters.payment_status === 'todos' ? true : item.payment_status === installmentFilters.payment_status,
      )
      .filter((item) =>
        installmentFilters.payment_method === 'todos' ? true : item.payment_method === installmentFilters.payment_method,
      )
      .filter((item) =>
        installmentFilters.reference_month === 'todos' ? true : item.reference_month === installmentFilters.reference_month,
      )
      .filter((item) =>
        installmentFilters.student_id === 'todos' ? true : Number(installmentFilters.student_id) === item.student_id,
      )
      .filter((item) =>
        installmentFilters.family_id === 'todos' ? true : Number(installmentFilters.family_id) === item.family_id,
      )
      .sort((a, b) => String(a.due_date || '').localeCompare(String(b.due_date || ''), 'pt-BR'))
  }, [rows, installmentFilters])

  const inadimplenteRows = useMemo(() => {
    return rows
      .filter((item) => item.cash_flow_type === 'entrada')
      .filter((item) => ['pending', 'overdue'].includes(item.payment_status))
      .filter((item) =>
        inadimplenteFilters.payment_status === 'todos' ? true : item.payment_status === inadimplenteFilters.payment_status,
      )
      .filter((item) =>
        inadimplenteFilters.family_id === 'todos' ? true : Number(inadimplenteFilters.family_id) === item.family_id,
      )
      .filter((item) =>
        inadimplenteFilters.student_id === 'todos' ? true : Number(inadimplenteFilters.student_id) === item.student_id,
      )
      .filter((item) =>
        inadimplenteFilters.responsible_id === 'todos'
          ? true
          : Number(inadimplenteFilters.responsible_id) === Number(item.responsible_id),
      )
      .sort((a, b) => String(a.due_date || '').localeCompare(String(b.due_date || ''), 'pt-BR'))
  }, [rows, inadimplenteFilters])

  const scholarshipRows = useMemo(() => {
    return rows
      .filter((item) => item.cash_flow_type === 'entrada')
      .filter((item) => item.has_scholarship || item.scholarship_type)
      .filter((item) =>
        scholarshipFilters.scholarship_type === 'todos'
          ? true
          : item.scholarship_type === scholarshipFilters.scholarship_type,
      )
      .filter((item) =>
        scholarshipFilters.payment_status === 'todos' ? true : item.payment_status === scholarshipFilters.payment_status,
      )
      .sort((a, b) => String(a.reference_month || '').localeCompare(String(b.reference_month || ''), 'pt-BR'))
  }, [rows, scholarshipFilters])

  const cashRows = useMemo(() => {
    return rows
      .filter((item) => (cashFilters.reference_month === 'todos' ? true : item.reference_month === cashFilters.reference_month))
      .filter((item) => (cashFilters.movement_status === 'todos' ? true : item.payment_status === cashFilters.movement_status))
      .sort((a, b) => String(a.payment_date || a.due_date || '').localeCompare(String(b.payment_date || b.due_date || ''), 'pt-BR'))
  }, [rows, cashFilters])

  const cashSummary = useMemo(() => {
    const entradaPaga = cashRows.filter((item) => item.cash_flow_type === 'entrada' && item.payment_status === 'paid')
    const saidaPaga = cashRows.filter((item) => item.cash_flow_type === 'saída' && item.payment_status === 'paid')
    const entradaPendente = cashRows.filter((item) => item.cash_flow_type === 'entrada' && item.payment_status !== 'paid')
    const saidaPendente = cashRows.filter((item) => item.cash_flow_type === 'saída' && item.payment_status !== 'paid')

    const sum = (items) => items.reduce((acc, item) => acc + Number(item.amount || 0), 0)
    return {
      entradas_pagas: sum(entradaPaga),
      saidas_pagas: sum(saidaPaga),
      saldo_realizado: sum(entradaPaga) - sum(saidaPaga),
      entradas_previstas: sum(entradaPendente),
      saidas_previstas: sum(saidaPendente),
    }
  }, [cashRows])

  const installmentPage = paginateRows(installmentRows, page, pageSize)
  const inadimplentePage = paginateRows(inadimplenteRows, page, pageSize)
  const scholarshipPage = paginateRows(scholarshipRows, page, pageSize)
  const cashPage = paginateRows(cashRows, page, pageSize)

  async function marcarComoPago(row, forcedMethod = null) {
    try {
      await schoolCrudService.marcarFinanceiroComoPago(row.id, {
        userName: `Usuário ${role}`,
        paymentMethod: forcedMethod || undefined,
      })
      await loadData()
    } catch (err) {
      setError(err.message ?? 'Não foi possível marcar lançamento como pago.')
    }
  }

  async function cancelarLancamento(row) {
    const reason = window.prompt('Motivo do cancelamento:')
    if (reason === null) return
    try {
      await financialService.cancelRecord(row.id, { changedBy: `Usuário ${role}`, reason })
      await loadData()
    } catch (err) {
      setError(err.message ?? 'Não foi possível cancelar o lançamento.')
    }
  }

  async function renegociarLancamento(row) {
    const splits = window.prompt('Em quantas parcelas deseja renegociar?', '2')
    if (splits === null) return
    const splitCount = Number(splits)
    if (!Number.isFinite(splitCount) || splitCount < 1) {
      setError('Número de parcelas inválido.')
      return
    }
    try {
      await financialService.renegotiateRecord(row.id, {
        changedBy: `Usuário ${role}`,
        splitCount,
      })
      await loadData()
    } catch (err) {
      setError(err.message ?? 'Não foi possível renegociar o lançamento.')
    }
  }

  async function conciliarLancamento(row) {
    try {
      await financialService.conciliateRecord(row.id, { changedBy: `Usuário ${role}` })
      await loadData()
    } catch (err) {
      setError(err.message ?? 'Não foi possível conciliar o lançamento.')
    }
  }

  async function buscarAlunoFinanceiro() {
    const query = studentQuery.trim()
    if (!query) {
      setStudentStatement(null)
      return
    }
    try {
      setStatementLoading(true)
      const result = await schoolCrudService.getFinancialStudentStatement(query)
      setStudentStatement(result)
    } catch (err) {
      setError(err.message ?? 'Não foi possível buscar aluno no financeiro.')
    } finally {
      setStatementLoading(false)
    }
  }

  async function verHistorico(row, dateRange = { fromDate: auditFromDate, toDate: auditToDate }) {
    const history = await schoolCrudService.listAuditLogsByEntity({
      entityType: 'financial_record',
      entityId: row.id,
      fromDate: dateRange.fromDate,
      toDate: dateRange.toDate,
    })
    setAuditRows(history)
    setAuditRecordId(row.id)
  }

  function exportSectionRows(filename, dataRows) {
    const columns = [
      { label: 'Família', getValue: (row) => row.family?.family_name ?? '-' },
      { label: 'Aluno', getValue: (row) => row.student?.full_name ?? '-' },
      { label: 'RA', getValue: (row) => row.student?.ra_code ?? '-' },
      { label: 'Tipo de cobrança', getValue: (row) => row.item_type ?? '-' },
      { label: 'Parcela', getValue: (row) => row.installment_label ?? '-' },
      { label: 'Mês referência', getValue: (row) => row.reference_month ?? '-' },
      { label: 'Valor', getValue: (row) => Number(row.amount || 0).toFixed(2) },
      { label: 'Status', getValue: (row) => paymentStatusLabel(row.payment_status) },
      { label: 'Forma de pagamento', getValue: (row) => paymentMethodLabel(row.payment_method) },
      { label: 'Vencimento', getValue: (row) => row.due_date ?? '-' },
      { label: 'Pagamento', getValue: (row) => row.payment_date ?? '-' },
      { label: 'Bolsa/Desconto', getValue: (row) => row.scholarship_type || '-' },
      { label: 'Fluxo', getValue: (row) => flowTypeLabel(row.cash_flow_type) },
    ]
    downloadCsv({ filename: `${filename}.csv`, columns, rows: dataRows })
  }

  return (
    <AppShell
      title="Financeiro"
      subtitle="Controle diário com visão de parcelas, inadimplência, bolsas/descontos, fluxo de caixa e busca financeira por aluno."
    >
      <ErrorBox message={error} />

      <section className="mb-4 flex flex-wrap gap-2 rounded-2xl border border-sky-100 bg-white p-3 shadow-sm">
        {sectionItems.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${
              activeSection === item.key
                ? 'bg-sky-700 text-white'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
            onClick={() => setActiveSection(item.key)}
          >
            {item.label}
          </button>
        ))}
      </section>

      {loading ? <LoadingRow text="Carregando dados financeiros..." /> : null}

      {!loading && activeSection === 'dashboard' ? (
        <>
          {/* Period filter */}
          <div className="mb-4">
            <DateFilter value={dateFilter} onChange={setDateFilter} />
          </div>

          <section className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card label="Faturamento previsto" value={currencyFormatter.format(Number(summary?.total_previsto_semestre || 0))} />
            <Card label="Total pago" value={currencyFormatter.format(Number(summary?.total_pago || 0))} tone="emerald" />
            <Card label="Pendente" value={currencyFormatter.format(Number(summary?.total_pendente || 0))} tone="amber" />
            <Card label="Inadimplente" value={currencyFormatter.format(Number(summary?.total_inadimplente || 0))} tone="rose" />
          </section>

          <section className="mb-4 grid gap-3 sm:grid-cols-3">
            <Card label="Entradas" value={currencyFormatter.format(Number(summary?.total_entradas || 0))} tone="emerald" />
            <Card label="Saídas" value={currencyFormatter.format(Number(summary?.total_saidas || 0))} tone="rose" />
            <Card label="Saldo de caixa" value={currencyFormatter.format(Number(summary?.saldo_caixa || 0))} tone="slate" />
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-slate-900">Evolução financeira mensal</h3>
            <p className="mt-0.5 text-xs text-slate-500">Comparativo de valor previsto, pago, pendente e inadimplente.</p>
            <FinanceTrendChart rows={financialTrendRows} />
          </section>

          {role !== 'cozinha' ? (
            <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-slate-900">Bloqueio de período</h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Lançamentos com vencimento até a data de bloqueio não podem ser alterados.
                {periodLockDate ? (
                  <span className="ml-2 inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                    Bloqueado até {periodLockDate}
                  </span>
                ) : (
                  <span className="ml-2 inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
                    Sem bloqueio
                  </span>
                )}
              </p>
              <div className="mt-3 flex items-end gap-3">
                <label className="text-xs text-slate-600">
                  Data limite
                  <input
                    type="date"
                    className="mt-1 block rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                    value={lockInput}
                    onChange={(e) => setLockInput(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="rounded-lg bg-amber-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
                  onClick={async () => {
                    try {
                      await financialService.setPeriodLock(lockInput || null)
                      setPeriodLockDate(lockInput || '')
                      alert(lockInput ? `Período bloqueado até ${lockInput}.` : 'Bloqueio de período removido.')
                    } catch (err) {
                      alert(`Erro: ${err.message}`)
                    }
                  }}
                >
                  {lockInput ? 'Definir bloqueio' : 'Remover bloqueio'}
                </button>
                {periodLockDate ? (
                  <button
                    type="button"
                    className="rounded-lg bg-slate-100 px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                    onClick={async () => {
                      try {
                        await financialService.setPeriodLock(null)
                        setPeriodLockDate('')
                        setLockInput('')
                        alert('Bloqueio de período removido.')
                      } catch (err) {
                        alert(`Erro: ${err.message}`)
                      }
                    }}
                  >
                    Remover bloqueio
                  </button>
                ) : null}
              </div>
            </section>
          ) : null}
        </>
      ) : null}

      {!loading && activeSection === 'parcelas' ? (
        <>
          <section className="mb-4 grid gap-3 rounded-2xl border border-sky-100 bg-white p-4 md:grid-cols-2 xl:grid-cols-5">
            <Select value={installmentFilters.payment_status} onChange={(value) => setInstallmentFilters((prev) => ({ ...prev, payment_status: value }))}>
              <option value="todos">Status: todos</option>
              <option value="pending">Pendente</option>
              <option value="paid">Pago</option>
              <option value="overdue">Inadimplente</option>
            </Select>
            <Select value={installmentFilters.payment_method} onChange={(value) => setInstallmentFilters((prev) => ({ ...prev, payment_method: value }))}>
              <option value="todos">Forma: todas</option>
              <option value="cash">Dinheiro</option>
              <option value="pix">PIX</option>
              <option value="card">Cartão</option>
              <option value="boleto">Boleto</option>
            </Select>
            <Select value={installmentFilters.reference_month} onChange={(value) => setInstallmentFilters((prev) => ({ ...prev, reference_month: value }))}>
              <option value="todos">Mês de referência: todos</option>
              {monthOptions.map((month) => (
                <option key={month} value={month}>{month}</option>
              ))}
            </Select>
            <Select value={installmentFilters.student_id} onChange={(value) => setInstallmentFilters((prev) => ({ ...prev, student_id: value }))}>
              <option value="todos">Aluno: todos</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>{student.full_name}</option>
              ))}
            </Select>
            <Select value={installmentFilters.family_id} onChange={(value) => setInstallmentFilters((prev) => ({ ...prev, family_id: value }))}>
              <option value="todos">Família: todas</option>
              {families.map((family) => (
                <option key={family.id} value={family.id}>{family.family_name}</option>
              ))}
            </Select>

            <div className="flex flex-wrap items-end gap-2 md:col-span-2 xl:col-span-5">
              <ClearFiltersButton
                onClick={() => setInstallmentFilters(defaultInstallmentFilters)}
              />
              <button type="button" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700" onClick={() => exportSectionRows('financeiro_parcelas', installmentRows)}>
                Exportar CSV
              </button>
              <button type="button" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700" onClick={() => downloadExcelLike({ filename: 'financeiro_parcelas.xls', columns: [{ label: 'Família', getValue: (row) => row.family?.family_name ?? '-' }, { label: 'Aluno', getValue: (row) => row.student?.full_name ?? '-' }, { label: 'Parcela', getValue: (row) => row.installment_label }, { label: 'Referência', key: 'reference_month' }, { label: 'Valor', getValue: (row) => Number(row.amount || 0).toFixed(2) }, { label: 'Status', getValue: (row) => paymentStatusLabel(row.payment_status) }, { label: 'Forma', getValue: (row) => paymentMethodLabel(row.payment_method) }], rows: installmentRows })}>
                Exportar Excel
              </button>
            </div>
          </section>

          <section className="flex min-h-[620px] flex-col overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm">
            <div className="flex-1 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-sky-50/70 text-left text-xs uppercase tracking-wide text-sky-800">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Família/Aluno</th>
                    <th className="px-4 py-3 font-semibold">Parcela</th>
                    <th className="px-4 py-3 font-semibold">Referência</th>
                    <th className="px-4 py-3 font-semibold">Valor</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Forma</th>
                    <th className="px-4 py-3 font-semibold">Vencimento</th>
                    <th className="px-4 py-3 font-semibold">Pagamento</th>
                    <th className="px-4 py-3 font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {installmentPage.paginatedRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        {row.family?.id ? (
                          <button type="button" className="text-left font-semibold text-slate-900 hover:text-sky-700" onClick={() => openFamilyInfo(row.family.id)}>
                            {row.family?.family_name || '-'}
                          </button>
                        ) : (
                          <p className="font-semibold text-slate-900">-</p>
                        )}
                        {row.student?.id ? (
                          <button type="button" className="block text-xs text-sky-700 hover:underline" onClick={() => openStudentInfo(row.student.id)}>
                            {row.student?.full_name || '-'} ({row.student?.ra_code || '-'})
                          </button>
                        ) : (
                          <p className="text-xs text-slate-500">Sem aluno vinculado</p>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{row.installment_label}</td>
                      <td className="px-4 py-3 text-slate-700">{row.reference_month || '-'}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{currencyFormatter.format(Number(row.amount || 0))}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(row.payment_status)}`}>
                          {paymentStatusLabel(row.payment_status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{paymentMethodLabel(row.payment_method)}</td>
                      <td className="px-4 py-3 text-slate-700">{row.due_date || '-'}</td>
                      <td className="px-4 py-3 text-slate-700">{row.payment_date || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {row.payment_status === 'pending' || row.payment_status === 'overdue' ? (
                            <button type="button" className="rounded-lg border border-emerald-200 px-2 py-1 text-xs font-semibold text-emerald-700" onClick={() => marcarComoPago(row)}>
                              Marcar pago
                            </button>
                          ) : null}
                          {row.payment_status === 'pending' || row.payment_status === 'overdue' ? (
                            <button type="button" className="rounded-lg border border-sky-200 px-2 py-1 text-xs font-semibold text-sky-700" onClick={() => marcarComoPago(row, 'cash')}>
                              Pago em dinheiro
                            </button>
                          ) : null}
                          {row.payment_status === 'pending' || row.payment_status === 'overdue' ? (
                            <button type="button" className="rounded-lg border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-700" onClick={() => cancelarLancamento(row)}>
                              Cancelar
                            </button>
                          ) : null}
                          {row.payment_status === 'pending' || row.payment_status === 'overdue' ? (
                            <button type="button" className="rounded-lg border border-purple-200 px-2 py-1 text-xs font-semibold text-purple-700" onClick={() => renegociarLancamento(row)}>
                              Renegociar
                            </button>
                          ) : null}
                          {row.payment_status === 'paid' ? (
                            <button type="button" className="rounded-lg border border-sky-200 px-2 py-1 text-xs font-semibold text-sky-700" onClick={() => conciliarLancamento(row)}>
                              Conciliar
                            </button>
                          ) : null}
                          <button type="button" className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700" onClick={() => verHistorico(row)}>
                            Histórico
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {installmentPage.paginatedRows.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-slate-500" colSpan={9}>Nenhuma parcela encontrada.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <PaginationControls
              totalItems={installmentRows.length}
              page={installmentPage.currentPage}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(nextSize) => {
                setPageSize(nextSize)
                setPage(1)
              }}
            />
          </section>
        </>
      ) : null}

      {!loading && activeSection === 'inadimplentes' ? (
        <>
          <section className="mb-4 grid gap-3 rounded-2xl border border-sky-100 bg-white p-4 md:grid-cols-2 xl:grid-cols-4">
            <Select value={inadimplenteFilters.payment_status} onChange={(value) => setInadimplenteFilters((prev) => ({ ...prev, payment_status: value }))}>
              <option value="todos">Status: pendente e inadimplente</option>
              <option value="pending">Somente pendente</option>
              <option value="overdue">Somente inadimplente</option>
            </Select>
            <Select value={inadimplenteFilters.responsible_id} onChange={(value) => setInadimplenteFilters((prev) => ({ ...prev, responsible_id: value }))}>
              <option value="todos">Responsável: todos</option>
              {responsibles.map((item) => (
                <option key={item.id} value={item.id}>{item.full_name}</option>
              ))}
            </Select>
            <Select value={inadimplenteFilters.family_id} onChange={(value) => setInadimplenteFilters((prev) => ({ ...prev, family_id: value }))}>
              <option value="todos">Família: todas</option>
              {families.map((family) => (
                <option key={family.id} value={family.id}>{family.family_name}</option>
              ))}
            </Select>
            <Select value={inadimplenteFilters.student_id} onChange={(value) => setInadimplenteFilters((prev) => ({ ...prev, student_id: value }))}>
              <option value="todos">Aluno: todos</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>{student.full_name}</option>
              ))}
            </Select>

            <div className="md:col-span-2 xl:col-span-4">
              <ClearFiltersButton onClick={() => setInadimplenteFilters(defaultInadimplenteFilters)} />
            </div>
          </section>

          <section className="flex min-h-[620px] flex-col overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm">
            <div className="flex-1 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-sky-50/70 text-left text-xs uppercase tracking-wide text-sky-800">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Família/Aluno</th>
                    <th className="px-4 py-3 font-semibold">Cobrança</th>
                    <th className="px-4 py-3 font-semibold">Parcela</th>
                    <th className="px-4 py-3 font-semibold">Vencimento</th>
                    <th className="px-4 py-3 font-semibold">Valor</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Responsável</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inadimplentePage.paginatedRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{row.family?.family_name || '-'}</p>
                        <p className="text-xs text-slate-500">{row.student?.full_name || 'Sem aluno vinculado'}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{row.item_type}{row.item_subtype ? ` • ${row.item_subtype}` : ''}</td>
                      <td className="px-4 py-3 text-slate-700">{row.installment_label}</td>
                      <td className="px-4 py-3 text-slate-700">{row.due_date || '-'}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{currencyFormatter.format(Number(row.amount || 0))}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(row.payment_status)}`}>
                          {paymentStatusLabel(row.payment_status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{row.responsible?.full_name || '-'}</td>
                    </tr>
                  ))}
                  {inadimplentePage.paginatedRows.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-slate-500" colSpan={7}>Nenhum lançamento inadimplente/pendente com estes filtros.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <PaginationControls
              totalItems={inadimplenteRows.length}
              page={inadimplentePage.currentPage}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(nextSize) => {
                setPageSize(nextSize)
                setPage(1)
              }}
            />
          </section>
        </>
      ) : null}

      {!loading && activeSection === 'bolsas' ? (
        <>
          <section className="mb-4 grid gap-3 rounded-2xl border border-sky-100 bg-white p-4 md:grid-cols-2 xl:grid-cols-4">
            <Select value={scholarshipFilters.scholarship_type} onChange={(value) => setScholarshipFilters((prev) => ({ ...prev, scholarship_type: value }))}>
              <option value="todos">Tipo de bolsa/desconto: todos</option>
              {scholarshipTypeOptions.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </Select>
            <Select value={scholarshipFilters.payment_status} onChange={(value) => setScholarshipFilters((prev) => ({ ...prev, payment_status: value }))}>
              <option value="todos">Status: todos</option>
              <option value="pending">Pendente</option>
              <option value="paid">Pago</option>
              <option value="overdue">Inadimplente</option>
            </Select>
            <div className="md:col-span-2 xl:col-span-2">
              <ClearFiltersButton onClick={() => setScholarshipFilters(defaultScholarshipFilters)} />
            </div>
          </section>

          <section className="mb-4 grid gap-3 sm:grid-cols-3">
            <Card label="Registros com bolsa/desconto" value={String(scholarshipRows.length)} />
            <Card label="Valor total com bolsa/desconto" value={currencyFormatter.format(scholarshipRows.reduce((acc, item) => acc + Number(item.amount || 0), 0))} />
            <Card label="Tipos de bolsa ativos" value={String(new Set(scholarshipRows.map((item) => item.scholarship_type).filter(Boolean)).size)} />
          </section>

          <section className="flex min-h-[620px] flex-col overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm">
            <div className="flex-1 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-sky-50/70 text-left text-xs uppercase tracking-wide text-sky-800">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Família/Aluno</th>
                    <th className="px-4 py-3 font-semibold">Bolsa/Desconto</th>
                    <th className="px-4 py-3 font-semibold">Cobrança</th>
                    <th className="px-4 py-3 font-semibold">Parcela</th>
                    <th className="px-4 py-3 font-semibold">Valor</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {scholarshipPage.paginatedRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{row.family?.family_name || '-'}</p>
                        <p className="text-xs text-slate-500">{row.student?.full_name || '-'}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{row.scholarship_type || 'Bolsa sem tipo definido'}</td>
                      <td className="px-4 py-3 text-slate-700">{row.item_type}</td>
                      <td className="px-4 py-3 text-slate-700">{row.installment_label}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{currencyFormatter.format(Number(row.amount || 0))}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(row.payment_status)}`}>
                          {paymentStatusLabel(row.payment_status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {scholarshipPage.paginatedRows.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-slate-500" colSpan={6}>Nenhum lançamento com bolsa/desconto encontrado.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <PaginationControls
              totalItems={scholarshipRows.length}
              page={scholarshipPage.currentPage}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(nextSize) => {
                setPageSize(nextSize)
                setPage(1)
              }}
            />
          </section>
        </>
      ) : null}

      {!loading && activeSection === 'extrato' ? (
        <>
          <section className="mb-4 grid gap-3 rounded-2xl border border-sky-100 bg-white p-4 md:grid-cols-2 xl:grid-cols-3">
            <Select value={cashFilters.reference_month} onChange={(value) => setCashFilters((prev) => ({ ...prev, reference_month: value }))}>
              <option value="todos">Mês de referência: todos</option>
              {monthOptions.map((month) => (
                <option key={month} value={month}>{month}</option>
              ))}
            </Select>
            <Select value={cashFilters.movement_status} onChange={(value) => setCashFilters((prev) => ({ ...prev, movement_status: value }))}>
              <option value="todos">Status: todos</option>
              <option value="paid">Pago</option>
              <option value="pending">Pendente</option>
              <option value="overdue">Inadimplente</option>
            </Select>
            <ClearFiltersButton onClick={() => setCashFilters(defaultCashFilters)} />
          </section>

          <section className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Card label="Entradas (pagas)" value={currencyFormatter.format(cashSummary.entradas_pagas)} tone="emerald" />
            <Card label="Saídas (pagas)" value={currencyFormatter.format(cashSummary.saidas_pagas)} tone="rose" />
            <Card label="Saldo realizado" value={currencyFormatter.format(cashSummary.saldo_realizado)} />
            <Card label="Entradas previstas" value={currencyFormatter.format(cashSummary.entradas_previstas)} tone="amber" />
            <Card label="Saídas previstas" value={currencyFormatter.format(cashSummary.saidas_previstas)} tone="amber" />
          </section>

          <section className="mb-4 flex flex-wrap gap-2">
            <button type="button" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700" onClick={() => exportSectionRows('financeiro_extrato_caixa', cashRows)}>
              Exportar CSV
            </button>
            <button type="button" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700" onClick={() => downloadExcelLike({ filename: 'financeiro_extrato_caixa.xls', columns: [{ label: 'Fluxo', getValue: (row) => flowTypeLabel(row.cash_flow_type) }, { label: 'Status', getValue: (row) => paymentStatusLabel(row.payment_status) }, { label: 'Data movimentação', getValue: (row) => row.payment_date || row.due_date || '-' }, { label: 'Valor', getValue: (row) => Number(row.amount || 0).toFixed(2) }, { label: 'Família', getValue: (row) => row.family?.family_name || '-' }, { label: 'Aluno', getValue: (row) => row.student?.full_name || '-' }, { label: 'Descrição', getValue: (row) => row.notes || row.item_type }], rows: cashRows })}>
              Exportar Excel
            </button>
            <button type="button" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500">
              Exportar PDF (em breve)
            </button>
          </section>

          <section className="flex min-h-[620px] flex-col overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm">
            <div className="flex-1 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-sky-50/70 text-left text-xs uppercase tracking-wide text-sky-800">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Fluxo</th>
                    <th className="px-4 py-3 font-semibold">Data</th>
                    <th className="px-4 py-3 font-semibold">Descrição</th>
                    <th className="px-4 py-3 font-semibold">Família/Aluno</th>
                    <th className="px-4 py-3 font-semibold">Forma</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cashPage.paginatedRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${flowTypeClass(row.cash_flow_type)}`}>
                          {flowTypeLabel(row.cash_flow_type)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{row.payment_date || row.due_date || '-'}</td>
                      <td className="px-4 py-3 text-slate-700">{row.notes || row.item_type || '-'}</td>
                      <td className="px-4 py-3">
                        <p className="text-slate-900">{row.family?.family_name || '-'}</p>
                        <p className="text-xs text-slate-500">{row.student?.full_name || '-'}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{paymentMethodLabel(row.payment_method)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(row.payment_status)}`}>
                          {paymentStatusLabel(row.payment_status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{currencyFormatter.format(Number(row.amount || 0))}</td>
                    </tr>
                  ))}
                  {cashPage.paginatedRows.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-slate-500" colSpan={7}>Nenhuma movimentação encontrada para os filtros aplicados.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <PaginationControls
              totalItems={cashRows.length}
              page={cashPage.currentPage}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(nextSize) => {
                setPageSize(nextSize)
                setPage(1)
              }}
            />
          </section>
        </>
      ) : null}

      {!loading && activeSection === 'busca' ? (
        <>
          <section className="mb-4 rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
              <input
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                placeholder="Buscar por matrícula (RA) ou nome do aluno"
                value={studentQuery}
                onChange={(event) => setStudentQuery(event.target.value)}
              />
              <button type="button" className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white" onClick={buscarAlunoFinanceiro}>
                Buscar aluno
              </button>
              <button type="button" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700" onClick={() => { setStudentQuery(''); setStudentStatement(null) }}>
                Limpar
              </button>
            </div>
          </section>

          {statementLoading ? <LoadingRow text="Buscando extrato do aluno..." /> : null}

          {!statementLoading && !studentStatement ? (
            <section className="rounded-2xl border border-sky-100 bg-white p-5 text-sm text-slate-600 shadow-sm">
              Digite matrícula (RA) ou nome para abrir o detalhamento financeiro do aluno/família.
            </section>
          ) : null}

          {!statementLoading && studentStatement ? (
            <>
              <section className="mb-4 grid gap-3 lg:grid-cols-3">
                <article className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900">Aluno</h3>
                  <p className="mt-2 font-semibold">{studentStatement.student.full_name}</p>
                  <p className="text-xs text-slate-500">RA: {studentStatement.student.ra_code || '-'}</p>
                  <p className="text-xs text-slate-500">Turma: {studentStatement.student.class_name || '-'}</p>
                </article>
                <article className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900">Família / Responsável</h3>
                  <p className="mt-2 font-semibold">{studentStatement.family?.family_name || '-'}</p>
                  <p className="text-xs text-slate-500">{studentStatement.responsible?.full_name || '-'}</p>
                  <p className="text-xs text-slate-500">{studentStatement.responsible?.phone || '-'}</p>
                </article>
                <article className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900">Bolsa / Desconto</h3>
                  <p className="mt-2 text-sm text-slate-700">
                    {studentStatement.resumo.tipos_bolsa.length > 0 ? studentStatement.resumo.tipos_bolsa.join(', ') : 'Sem bolsa/desconto'}
                  </p>
                  <p className="text-xs text-slate-500">
                    Inadimplência: {studentStatement.resumo.possui_inadimplencia ? 'Sim' : 'Não'}
                  </p>
                </article>
              </section>

              <section className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Card label="Já pago" value={currencyFormatter.format(studentStatement.resumo.total_pago)} tone="emerald" />
                <Card label="Em aberto" value={currencyFormatter.format(studentStatement.resumo.total_em_aberto)} tone="rose" />
                <Card label="Devido no mês" value={currencyFormatter.format(studentStatement.resumo.devido_mes_atual)} tone="amber" />
                <Card label="Pendente no ano" value={currencyFormatter.format(studentStatement.resumo.pendente_no_ano)} tone="amber" />
              </section>

              <section className="flex min-h-[520px] flex-col overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm">
                <div className="flex-1 overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100 text-sm">
                    <thead className="bg-sky-50/70 text-left text-xs uppercase tracking-wide text-sky-800">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Cobrança</th>
                        <th className="px-4 py-3 font-semibold">Parcela</th>
                        <th className="px-4 py-3 font-semibold">Referência</th>
                        <th className="px-4 py-3 font-semibold">Valor</th>
                        <th className="px-4 py-3 font-semibold">Forma</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold">Vencimento</th>
                        <th className="px-4 py-3 font-semibold">Pagamento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {studentStatement.rows.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50/70">
                          <td className="px-4 py-3 text-slate-700">{row.item_type}{row.item_subtype ? ` • ${row.item_subtype}` : ''}</td>
                          <td className="px-4 py-3 text-slate-700">{row.installment_label}</td>
                          <td className="px-4 py-3 text-slate-700">{row.reference_month || '-'}</td>
                          <td className="px-4 py-3 font-semibold text-slate-900">{currencyFormatter.format(Number(row.amount || 0))}</td>
                          <td className="px-4 py-3 text-slate-700">{paymentMethodLabel(row.payment_method)}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(row.payment_status)}`}>
                              {paymentStatusLabel(row.payment_status)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-700">{row.due_date || '-'}</td>
                          <td className="px-4 py-3 text-slate-700">{row.payment_date || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          ) : null}
        </>
      ) : null}

      {!loading && activeSection === 'contratos' ? (
        <section className="rounded-2xl border border-sky-100 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Contratos</h3>
              <p className="text-xs text-slate-500">Contratos geram parcelas automaticamente para cada mês do período.</p>
            </div>
            {role !== 'cozinha' ? (
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg bg-sky-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-800"
                onClick={() => setShowAddContract(!showAddContract)}
              >
                <Plus className="h-3.5 w-3.5" /> Novo contrato
              </button>
            ) : null}
          </div>

          {showAddContract ? (
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="text-xs text-slate-600">
                  Família
                  <select className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm" value={contractForm.family_id} onChange={(e) => setContractForm({ ...contractForm, family_id: e.target.value })}>
                    <option value="">Selecione...</option>
                    {families.map((f) => <option key={f.id} value={f.id}>{f.family_name}</option>)}
                  </select>
                </label>
                <label className="text-xs text-slate-600">
                  Aluno
                  <select className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm" value={contractForm.student_id} onChange={(e) => setContractForm({ ...contractForm, student_id: e.target.value })}>
                    <option value="">Selecione...</option>
                    {students.filter((s) => !contractForm.family_id || s.family_id === Number(contractForm.family_id)).map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                  </select>
                </label>
                <label className="text-xs text-slate-600">
                  Tipo de serviço
                  <select className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm" value={contractForm.service_type} onChange={(e) => setContractForm({ ...contractForm, service_type: e.target.value })}>
                    <option value="mensalidade">Mensalidade</option>
                    <option value="matrícula">Matrícula</option>
                    <option value="material">Material</option>
                    <option value="alimentação">Alimentação</option>
                    <option value="extracurricular">Extracurricular</option>
                    <option value="contraturno">Contraturno</option>
                    <option value="plantão">Plantão</option>
                  </select>
                </label>
                <label className="text-xs text-slate-600">
                  Valor por parcela (R$)
                  <input className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm" type="number" step="0.01" min="0" value={contractForm.amount_per_installment} onChange={(e) => setContractForm({ ...contractForm, amount_per_installment: e.target.value })} />
                </label>
                <label className="text-xs text-slate-600">
                  Parcelas
                  <input className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm" type="number" min="1" max="48" value={contractForm.installment_count} onChange={(e) => setContractForm({ ...contractForm, installment_count: e.target.value })} />
                </label>
                <label className="text-xs text-slate-600">
                  Dia de vencimento
                  <input className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm" type="number" min="1" max="28" value={contractForm.due_day} onChange={(e) => setContractForm({ ...contractForm, due_day: e.target.value })} />
                </label>
                <label className="text-xs text-slate-600">
                  Mês inicial
                  <input className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm" type="month" value={contractForm.start_month} onChange={(e) => setContractForm({ ...contractForm, start_month: e.target.value })} />
                </label>
                <div className="flex items-end">
                  <button
                    type="button"
                    className="w-full rounded-lg bg-sky-700 px-3 py-2 text-xs font-semibold text-white"
                    onClick={async () => {
                      try {
                        await contractService.createContract({ ...contractForm, changedBy: `Usuário ${role}` })
                        setShowAddContract(false)
                        setContractForm({ family_id: '', student_id: '', service_type: 'mensalidade', description: '', amount_per_installment: '', installment_count: '12', due_day: '10', start_month: new Date().toISOString().slice(0, 7), category_code: '', notes: '' })
                        loadData()
                      } catch (err) {
                        setError(err.message)
                      }
                    }}
                  >
                    Criar contrato
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-sky-50/70 text-left text-xs uppercase tracking-wide text-sky-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">#</th>
                  <th className="px-4 py-3 font-semibold">Família</th>
                  <th className="px-4 py-3 font-semibold">Aluno</th>
                  <th className="px-4 py-3 font-semibold">Serviço</th>
                  <th className="px-4 py-3 font-semibold">Valor/Parcela</th>
                  <th className="px-4 py-3 font-semibold">Parcelas</th>
                  <th className="px-4 py-3 font-semibold">Período</th>
                  <th className="px-4 py-3 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contracts.map((c) => {
                  const family = families.find((f) => f.id === c.family_id)
                  const student = students.find((s) => s.id === c.student_id)
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{c.id}</td>
                      <td className="px-4 py-3 text-slate-700">{family?.family_name || '-'}</td>
                      <td className="px-4 py-3 text-slate-700">{student?.full_name || '-'}</td>
                      <td className="px-4 py-3 text-slate-700">{c.service_type}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{currencyFormatter.format(c.amount_per_installment)}</td>
                      <td className="px-4 py-3 text-slate-700">{c.installment_count}x</td>
                      <td className="px-4 py-3 text-slate-700">{c.start_month} → {c.end_month}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className="rounded-lg border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-700"
                          onClick={async () => {
                            if (!window.confirm('Excluir contrato e todas as parcelas pendentes?')) return
                            try {
                              await contractService.deleteContract(c.id)
                              loadData()
                            } catch (err) {
                              setError(err.message)
                            }
                          }}
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {contracts.length === 0 ? (
                  <tr><td colSpan="8" className="px-4 py-6 text-center text-sm text-slate-500">Nenhum contrato cadastrado.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {!loading && activeSection === 'conciliacao' ? (
        <section className="rounded-2xl border border-sky-100 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Conciliação Bancária</h3>
              <p className="text-xs text-slate-500">Importe extratos e concilie com lançamentos pagos. Formato: uma linha por entrada (data;descrição;valor).</p>
            </div>
          </div>

          <div className="border-b border-slate-100 px-5 py-4">
            <label className="text-xs text-slate-600">
              Colar extrato (data;descrição;valor — um por linha)
              <textarea
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono"
                rows={4}
                placeholder="2026-04-10;Mensalidade Fam. Souza;1200.00&#10;2026-04-11;Material Didático;350.00"
                value={statementInput}
                onChange={(e) => setStatementInput(e.target.value)}
              />
            </label>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                className="rounded-lg bg-sky-700 px-3 py-1.5 text-xs font-semibold text-white"
                onClick={async () => {
                  try {
                    const lines = statementInput.trim().split('\n').filter(Boolean)
                    const entries = lines.map((line) => {
                      const [date, description, amount] = line.split(';')
                      return { date: date?.trim(), description: description?.trim(), amount: Number(amount?.trim()) || 0 }
                    })
                    if (entries.length === 0) { setError('Nenhuma entrada válida.'); return }
                    await reconciliationService.importBankStatement(entries, { changedBy: `Usuário ${role}` })
                    setStatementInput('')
                    setBankStatements(await reconciliationService.listStatements())
                  } catch (err) {
                    setError(err.message)
                  }
                }}
              >
                Importar extrato
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
                onClick={async () => {
                  try {
                    const result = await reconciliationService.autoMatch()
                    setMatchResult(result)
                  } catch (err) {
                    setError(err.message)
                  }
                }}
              >
                Auto-conciliar
              </button>
              {matchResult && matchResult.matched.length > 0 ? (
                <button
                  type="button"
                  className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white"
                  onClick={async () => {
                    try {
                      await reconciliationService.confirmAllMatches(matchResult.matched, { changedBy: `Usuário ${role}` })
                      setMatchResult(null)
                      loadData()
                    } catch (err) {
                      setError(err.message)
                    }
                  }}
                >
                  Confirmar {matchResult.matched.length} correspondência(s)
                </button>
              ) : null}
            </div>
          </div>

          {matchResult ? (
            <div className="border-b border-slate-100 px-5 py-4">
              <p className="mb-2 text-sm font-semibold text-slate-900">{matchResult.matched.length} correspondência(s) encontrada(s), {matchResult.unmatched.length} sem par</p>
              {matchResult.matched.map((m) => (
                <div key={m.statementEntry.id} className="mb-1 rounded-lg border border-emerald-100 bg-emerald-50/50 px-3 py-2 text-xs">
                  <span className="font-semibold text-emerald-800">{m.statementEntry.date}</span> — {m.statementEntry.description} — {currencyFormatter.format(m.statementEntry.amount)}
                  {' → '}Lançamento #{m.record.id} ({currencyFormatter.format(m.record.amount)})
                </div>
              ))}
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-sky-50/70 text-left text-xs uppercase tracking-wide text-sky-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Data</th>
                  <th className="px-4 py-3 font-semibold">Descrição</th>
                  <th className="px-4 py-3 font-semibold">Valor</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Lançamento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bankStatements.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 text-slate-700">{s.date}</td>
                    <td className="px-4 py-3 text-slate-700">{s.description}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{currencyFormatter.format(s.amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${s.status === 'matched' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {s.status === 'matched' ? 'Conciliado' : 'Pendente'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{s.matched_record_id ? `#${s.matched_record_id}` : '-'}</td>
                  </tr>
                ))}
                {bankStatements.length === 0 ? (
                  <tr><td colSpan="5" className="px-4 py-6 text-center text-sm text-slate-500">Nenhum extrato importado.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {!loading && activeSection === 'recorrencias' ? (
        <section className="rounded-2xl border border-sky-100 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Recorrências</h3>
              <p className="text-xs text-slate-500">Templates de despesas/receitas recorrentes que geram lançamentos automaticamente a cada mês.</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                onClick={async () => {
                  const month = new Date().toISOString().slice(0, 7)
                  try {
                    const count = await recurringTransactionService.generatePendingRecords(month)
                    alert(count > 0 ? `${count} lançamento(s) gerado(s) para ${month}.` : `Nenhum lançamento pendente para ${month}.`)
                    await loadData()
                  } catch (err) {
                    alert(`Erro: ${err.message}`)
                  }
                }}
              >
                Gerar mês atual
              </button>
              {role !== 'cozinha' ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg bg-sky-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-800"
                  onClick={() => setShowAddRecurring(!showAddRecurring)}
                >
                  <Plus className="h-3.5 w-3.5" /> Novo template
                </button>
              ) : null}
            </div>
          </div>

          {showAddRecurring ? (
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <label className="text-xs text-slate-600">
                  Descrição
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                    placeholder="Ex: Aluguel"
                    value={recurringForm.description}
                    onChange={(e) => setRecurringForm({ ...recurringForm, description: e.target.value })}
                  />
                </label>
                <label className="text-xs text-slate-600">
                  Valor (R$)
                  <input
                    type="number"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                    placeholder="0,00"
                    value={recurringForm.amount}
                    onChange={(e) => setRecurringForm({ ...recurringForm, amount: e.target.value })}
                  />
                </label>
                <label className="text-xs text-slate-600">
                  Tipo
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                    value={recurringForm.cash_flow_type}
                    onChange={(e) => setRecurringForm({ ...recurringForm, cash_flow_type: e.target.value })}
                  >
                    <option value="saída">Saída (despesa)</option>
                    <option value="entrada">Entrada (receita)</option>
                  </select>
                </label>
                <label className="text-xs text-slate-600">
                  Dia vencimento
                  <input
                    type="number"
                    min="1"
                    max="28"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                    value={recurringForm.due_day}
                    onChange={(e) => setRecurringForm({ ...recurringForm, due_day: e.target.value })}
                  />
                </label>
                <label className="text-xs text-slate-600">
                  Observação
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                    placeholder="Opcional"
                    value={recurringForm.notes}
                    onChange={(e) => setRecurringForm({ ...recurringForm, notes: e.target.value })}
                  />
                </label>
              </div>
              <button
                type="button"
                className="mt-3 rounded-lg bg-sky-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-sky-800"
                onClick={async () => {
                  try {
                    await recurringTransactionService.createTemplate(recurringForm)
                    setShowAddRecurring(false)
                    setRecurringForm({ description: '', amount: '', cash_flow_type: 'saída', due_day: '10', notes: '' })
                    await loadData()
                  } catch (err) {
                    alert(`Erro: ${err.message}`)
                  }
                }}
              >
                Salvar template
              </button>
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                  <th className="px-4 py-3 font-semibold">Descrição</th>
                  <th className="px-4 py-3 font-semibold">Valor</th>
                  <th className="px-4 py-3 font-semibold">Tipo</th>
                  <th className="px-4 py-3 font-semibold">Dia vcto.</th>
                  <th className="px-4 py-3 font-semibold">Último mês gerado</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recurringTemplates.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 text-slate-700">{t.description}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{currencyFormatter.format(t.amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${flowTypeClass(t.cash_flow_type)}`}>
                        {flowTypeLabel(t.cash_flow_type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{t.due_day}</td>
                    <td className="px-4 py-3 text-slate-500">{t.last_generated_month || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${t.active_status ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {t.active_status ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600 hover:bg-slate-200"
                          onClick={async () => {
                            try {
                              await recurringTransactionService.toggleTemplate(t.id)
                              await loadData()
                            } catch (err) {
                              alert(`Erro: ${err.message}`)
                            }
                          }}
                        >
                          {t.active_status ? 'Desativar' : 'Ativar'}
                        </button>
                        <button
                          type="button"
                          className="rounded bg-rose-50 px-2 py-1 text-xs text-rose-600 hover:bg-rose-100"
                          onClick={async () => {
                            if (!confirm('Excluir este template?')) return
                            try {
                              await recurringTransactionService.deleteTemplate(t.id)
                              await loadData()
                            } catch (err) {
                              alert(`Erro: ${err.message}`)
                            }
                          }}
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {recurringTemplates.length === 0 ? (
                  <tr><td colSpan="7" className="px-4 py-6 text-center text-sm text-slate-500">Nenhum template cadastrado.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {!loading && activeSection === 'plano_contas' ? (
        <section className="rounded-2xl border border-sky-100 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Plano de Contas</h3>
              <p className="text-xs text-slate-500">Estrutura hierárquica de contas contábeis. Contas analíticas (nível mais baixo) permitem lançamentos.</p>
            </div>
            {role !== 'cozinha' ? (
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg bg-sky-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-800"
                onClick={() => setShowAddCategory(!showAddCategory)}
              >
                <Plus className="h-3.5 w-3.5" /> Nova conta
              </button>
            ) : null}
          </div>

          {showAddCategory ? (
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <label className="text-xs text-slate-600">
                  Código
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                    placeholder="Ex: 5.2.12"
                    value={newCatCode}
                    onChange={(e) => setNewCatCode(e.target.value)}
                  />
                </label>
                <label className="text-xs text-slate-600">
                  Nome
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                    placeholder="Ex: Seguros"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                  />
                </label>
                <label className="text-xs text-slate-600">
                  Conta pai (código)
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                    placeholder="Ex: 5.2"
                    value={newCatParent}
                    onChange={(e) => setNewCatParent(e.target.value)}
                  />
                </label>
                <label className="text-xs text-slate-600">
                  Tipo
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                    value={newCatType}
                    onChange={(e) => setNewCatType(e.target.value)}
                  >
                    <option value="income">Receita</option>
                    <option value="expense">Despesa</option>
                  </select>
                </label>
                <div className="flex items-end">
                  <button
                    type="button"
                    className="w-full rounded-lg bg-sky-700 px-3 py-2 text-xs font-semibold text-white"
                    onClick={async () => {
                      try {
                        await schoolCrudService.createCategory({
                          code: newCatCode,
                          name: newCatName,
                          type: newCatType,
                          parent_code: newCatParent || null,
                        })
                        setNewCatCode('')
                        setNewCatName('')
                        setNewCatParent('')
                        setShowAddCategory(false)
                        loadData()
                      } catch (err) {
                        setError(err.message)
                      }
                    }}
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <div className="px-5 py-4">
            <CategoryTree nodes={buildCategoryTree(categories)} />
          </div>
        </section>
      ) : null}

      {auditRecordId ? (
        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900">Histórico do lançamento #{auditRecordId}</h3>
            <button type="button" className="text-xs font-semibold text-slate-600" onClick={() => setAuditRecordId(null)}>
              Fechar
            </button>
          </div>
          <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs text-slate-600">
              De
              <input
                type="date"
                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                value={auditFromDate}
                onChange={(event) => setAuditFromDate(event.target.value)}
              />
            </label>
            <label className="text-xs text-slate-600">
              Até
              <input
                type="date"
                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                value={auditToDate}
                onChange={(event) => setAuditToDate(event.target.value)}
              />
            </label>
            <div className="flex items-end">
              <button
                type="button"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
                onClick={() => verHistorico({ id: auditRecordId }, { fromDate: auditFromDate, toDate: auditToDate })}
              >
                Aplicar período
              </button>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
                onClick={() => {
                  setAuditFromDate('')
                  setAuditToDate('')
                  verHistorico({ id: auditRecordId }, { fromDate: '', toDate: '' })
                }}
              >
                Janela padrão (6 meses)
              </button>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            {auditRows.length === 0 ? <p className="text-slate-500">Sem histórico para este registro.</p> : null}
            {auditRows.map((item) => {
              let beforeObj = null
              let afterObj = null
              try { beforeObj = item.before_snapshot ? JSON.parse(item.before_snapshot) : null } catch { /* ignore */ }
              try { afterObj = item.after_snapshot ? JSON.parse(item.after_snapshot) : null } catch { /* ignore */ }
              const changedFields = beforeObj && afterObj
                ? Object.keys(afterObj).filter((k) => JSON.stringify(beforeObj[k]) !== JSON.stringify(afterObj[k]) && !['created_at', 'updated_at', 'updated_by'].includes(k))
                : []
              return (
                <article key={item.id} className="rounded-lg border border-slate-100 p-2">
                  <p className="font-semibold text-slate-900">{item.action}</p>
                  <p className="text-xs text-slate-600">{item.changed_by} • {new Date(item.changed_at).toLocaleString('pt-BR')}</p>
                  <p className="text-xs text-slate-600">{item.details}</p>
                  {changedFields.length > 0 ? (
                    <div className="mt-1 space-y-0.5">
                      {changedFields.map((field) => (
                        <p key={field} className="text-xs text-slate-500">
                          <span className="font-medium">{field}:</span>{' '}
                          <span className="text-rose-600 line-through">{String(beforeObj[field] ?? '-')}</span>{' → '}
                          <span className="text-emerald-700">{String(afterObj[field] ?? '-')}</span>
                        </p>
                      ))}
                    </div>
                  ) : null}
                </article>
              )
            })}
          </div>
        </section>
      ) : null}
    </AppShell>
  )
}

function Card({ label, value, tone = 'slate' }) {
  const toneClass =
    tone === 'emerald' ? 'text-emerald-700' : tone === 'amber' ? 'text-amber-700' : tone === 'rose' ? 'text-rose-700' : 'text-slate-900'

  return (
    <article className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-extrabold ${toneClass}`}>{value}</p>
    </article>
  )
}

function Select({ value, onChange, children }) {
  return (
    <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 pr-8 text-sm text-slate-700" value={value} onChange={(event) => onChange(event.target.value)}>
      {children}
    </select>
  )
}

function CategoryNode({ node, depth = 0 }) {
  const [open, setOpen] = useState(depth < 2)
  const hasChildren = node.children && node.children.length > 0
  const isSynthetic = node.kind === 'S'
  const typeLabel = node.type === 'income' ? 'Receita' : 'Despesa'
  const natureLabel = node.nature === 'D' ? 'Devedora' : 'Credora'

  return (
    <div>
      <div
        className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50 ${isSynthetic ? 'font-semibold text-slate-900' : 'text-slate-700'}`}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        {hasChildren ? (
          <button type="button" className="text-slate-400 hover:text-slate-700" onClick={() => setOpen(!open)}>
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : (
          <span className="inline-block w-4" />
        )}
        <span className="font-mono text-xs text-slate-400">{node.code}</span>
        <span className="flex-1">{node.name}</span>
        {!isSynthetic ? (
          <span className="text-xs text-slate-400">{typeLabel} / {natureLabel}</span>
        ) : null}
        {node.allow_posting ? (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Lançamento</span>
        ) : null}
      </div>
      {open && hasChildren ? node.children.map((child) => (
        <CategoryNode key={child.code} node={child} depth={depth + 1} />
      )) : null}
    </div>
  )
}

function CategoryTree({ nodes }) {
  if (!nodes || nodes.length === 0) {
    return <p className="text-sm text-slate-500">Nenhuma conta cadastrada.</p>
  }
  return (
    <div className="space-y-0.5">
      {nodes.map((node) => (
        <CategoryNode key={node.code} node={node} />
      ))}
    </div>
  )
}

function FinanceTrendChart({ rows }) {
  if (rows.length === 0) {
    return <p className="mt-3 text-sm text-slate-500">Sem dados suficientes para desenhar o gráfico.</p>
  }

  const maxValue = Math.max(...rows.map((item) => Math.max(item.previsto, item.pago, item.pendente, item.inadimplente)), 1)

  return (
    <div className="mt-4 overflow-x-auto">
      <div className="min-w-[900px]">
        <svg viewBox="0 0 1100 320" className="h-[320px] w-full rounded-xl border border-slate-100 bg-slate-50">
          {rows.map((item, index) => {
            const slot = 1100 / rows.length
            const x = index * slot + slot / 2
            const previstoHeight = (item.previsto / maxValue) * 200
            const pagoHeight = (item.pago / maxValue) * 200
            const pendenteHeight = (item.pendente / maxValue) * 200
            const inadimplenteHeight = (item.inadimplente / maxValue) * 200
            return (
              <g key={item.month}>
                <rect x={x - 48} y={260 - previstoHeight} width={18} height={previstoHeight} rx={3} fill="#bfdbfe" />
                <rect x={x - 24} y={260 - pagoHeight} width={18} height={pagoHeight} rx={3} fill="#22c55e" />
                <rect x={x} y={260 - pendenteHeight} width={18} height={pendenteHeight} rx={3} fill="#f59e0b" />
                <rect x={x + 24} y={260 - inadimplenteHeight} width={18} height={inadimplenteHeight} rx={3} fill="#ef4444" />
                <text x={x} y={288} textAnchor="middle" fontSize="11" fill="#334155">{item.month}</text>
              </g>
            )
          })}
        </svg>
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-600">
          <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded bg-blue-200" /> Previsto</span>
          <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded bg-green-500" /> Pago</span>
          <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded bg-amber-500" /> Pendente</span>
          <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded bg-rose-500" /> Inadimplente</span>
        </div>
      </div>
    </div>
  )
}
