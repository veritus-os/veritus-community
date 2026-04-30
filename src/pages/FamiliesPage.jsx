import { useEffect, useMemo, useState } from 'react'
import { Download, Minus, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import AppShell from '../components/AppShell'
import ClearFiltersButton from '../components/ClearFiltersButton'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import MinimizedQueue from '../components/MinimizedQueue'
import PaginationControls from '../components/PaginationControls'
import { ErrorBox, LoadingRow } from '../components/UiState'
import { createEmptyFamily, createEmptyResponsible, createEmptyStudent, EXTRACURRICULAR_OPTIONS, STUDENT_MODALITIES, STUDENT_SEGMENTS, STUDENT_SHIFTS } from '../core/models/schoolModels'
import { schoolCrudService, spreadsheetExportService } from '../core/services/repositoryRegistry'

function formatCpf(cpf) {
  if (!cpf) return '-'
  const digits = String(cpf).replace(/\D/g, '')
  if (digits.length !== 11) return cpf
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

export default function FamiliesPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [scholarshipFilter, setScholarshipFilter] = useState('todos')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // Popup state — supports queue of minimized items
  const [popupFamily, setPopupFamily] = useState(null)
  const [minimizedItems, setMinimizedItems] = useState([]) // array of family objects

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState(null) // { type: 'family'|'student', id, name, familyId? }

  // Edit form state
  const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false)
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false)
  const [familyForm, setFamilyForm] = useState({ family: createEmptyFamily(), responsible: createEmptyResponsible(), familyId: null })
  const [studentForm, setStudentForm] = useState({ ...createEmptyStudent(), id: null })

  async function loadData() {
    setLoading(true)
    try {
      const data = await schoolCrudService.listFamiliesDetailed()
      setRows(data)
      setPage(1)
    } catch (err) {
      setError(err.message ?? 'Não foi possível carregar famílias.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Update popup family data when rows change
  useEffect(() => {
    if (popupFamily) {
      const updated = rows.find((f) => f.id === popupFamily.id)
      if (updated) setPopupFamily(updated)
    }
  }, [rows])

  const filteredRows = useMemo(() => {
    const search = searchTerm.trim().toLowerCase()
    return rows.filter((family) => {
      if (!search) return true
      return (
        String(family.family_code || '').toLowerCase().includes(search) ||
        String(family.family_name || '').toLowerCase().includes(search) ||
        String(family.responsible?.full_name || '').toLowerCase().includes(search) ||
        family.students.some((student) => String(student.full_name || '').toLowerCase().includes(search))
      )
    }).filter((family) => {
      if (scholarshipFilter === 'com_bolsa') return family.has_scholarship
      if (scholarshipFilter === 'sem_bolsa') return !family.has_scholarship
      return true
    })
  }, [rows, searchTerm, scholarshipFilter])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paginatedFamilies = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  function openFamilyPopup(family) {
    // If there's already an open popup, minimize it to the queue
    if (popupFamily && popupFamily.id !== family.id) {
      setMinimizedItems((prev) => {
        if (prev.some((item) => item.id === popupFamily.id)) return prev
        return [...prev, popupFamily]
      })
    }
    // Remove from minimized queue if it was there
    setMinimizedItems((prev) => prev.filter((item) => item.id !== family.id))
    setPopupFamily(family)
  }

  function openNewFamilyModal() {
    setFamilyForm({ family: createEmptyFamily(), responsible: createEmptyResponsible(), familyId: null })
    setIsFamilyModalOpen(true)
  }

  function openEditFamilyModal(family) {
    setFamilyForm({
      familyId: family.id,
      family: {
        family_code: family.family_code || '',
        family_name: family.family_name || '',
        address: family.address || '',
        number: family.number || '',
        complement: family.complement || '',
        zip_code: family.zip_code || '',
        city: family.city || '',
        neighborhood: family.neighborhood || '',
        has_scholarship: family.has_scholarship ?? false,
        scholarship_notes: family.scholarship_notes || '',
        notes: family.notes || '',
      },
      responsible: {
        full_name: family.responsible?.full_name || '',
        cpf: family.responsible?.cpf || '',
        email: family.responsible?.email || '',
        phone: family.responsible?.phone || '',
        is_financial_responsible: family.responsible?.is_financial_responsible ?? true,
        pickup_authorized: family.responsible?.pickup_authorized ?? true,
        notes: family.responsible?.notes || '',
      },
    })
    setIsFamilyModalOpen(true)
  }

  function openAddStudentModal(family) {
    setStudentForm({ ...createEmptyStudent(), family_id: family.id, id: null })
    setIsStudentModalOpen(true)
  }

  function openEditStudentModal(student, familyId) {
    setStudentForm({ ...student, family_id: familyId ?? student.family_id, id: student.id })
    setIsStudentModalOpen(true)
  }

  async function saveFamily() {
    try {
      if (familyForm.familyId) {
        await schoolCrudService.updateFamilyAndResponsible({
          familyId: familyForm.familyId,
          family: familyForm.family,
          responsible: familyForm.responsible,
        })
      } else {
        await schoolCrudService.createFamilyWithResponsible({
          family: familyForm.family,
          responsible: familyForm.responsible,
        })
      }
      setIsFamilyModalOpen(false)
      await loadData()
    } catch (err) {
      setError(err.message ?? 'Erro ao salvar família.')
    }
  }

  async function saveStudent() {
    try {
      if (studentForm.id) {
        await schoolCrudService.updateStudent(studentForm.id, studentForm)
      } else {
        await schoolCrudService.createStudent(studentForm)
      }
      setIsStudentModalOpen(false)
      await loadData()
    } catch (err) {
      setError(err.message ?? 'Erro ao salvar aluno.')
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    try {
      if (deleteTarget.type === 'family') {
        await schoolCrudService.deleteFamily(deleteTarget.id)
        if (popupFamily?.id === deleteTarget.id) setPopupFamily(null)
        setMinimizedItems((prev) => prev.filter((item) => item.id !== deleteTarget.id))
      } else if (deleteTarget.type === 'student') {
        await schoolCrudService.deleteStudent(deleteTarget.id)
      }
      setDeleteTarget(null)
      await loadData()
    } catch (err) {
      setError(err.message ?? 'Erro ao excluir.')
      setDeleteTarget(null)
    }
  }

  async function handleExportBackup() {
    try {
      await spreadsheetExportService.exportCsv()
    } catch (err) {
      setError(err.message ?? 'Erro ao exportar backup.')
    }
  }

  function clearFilters() {
    setSearchTerm('')
    setScholarshipFilter('todos')
    setPage(1)
  }

  return (
    <AppShell
      title="Famílias"
      subtitle="Cadastro de famílias e responsáveis."
    >
      <ErrorBox message={error} />

      <section className="mb-4 flex flex-wrap items-center gap-2">
        <button type="button" className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white" onClick={openNewFamilyModal}>
          <span className="inline-flex items-center gap-1"><Plus className="h-4 w-4" /> Nova família</span>
        </button>
        <button type="button" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700" onClick={handleExportBackup}>
          <span className="inline-flex items-center gap-1"><Download className="h-4 w-4" /> Exportar backup</span>
        </button>
      </section>

      {/* Filters */}
      <section className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            className="w-full rounded-lg border border-slate-200 px-8 py-2 text-sm"
            placeholder="Buscar família, responsável ou aluno"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
        <select
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 pr-8 text-sm"
          value={scholarshipFilter}
          onChange={(event) => setScholarshipFilter(event.target.value)}
        >
          <option value="todos">Todas</option>
          <option value="com_bolsa">Com bolsa</option>
          <option value="sem_bolsa">Sem bolsa</option>
        </select>
        <ClearFiltersButton onClick={clearFilters} />
      </section>

      {loading ? <LoadingRow text="Carregando famílias..." /> : null}

      {!loading ? (
        <section className="flex min-h-[560px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {/* Mobile cards */}
          <div className="flex-1 divide-y divide-slate-100 md:hidden">
            {paginatedFamilies.map((family) => (
              <button
                type="button"
                key={family.id}
                className="w-full p-4 text-left hover:bg-slate-50"
                onClick={() => openFamilyPopup(family)}
              >
                <p className="font-semibold text-slate-900">{family.family_name}</p>
                <p className="text-xs text-sky-700">{family.family_code}</p>
                <p className="text-xs text-slate-500">{family.students.length} aluno(s)</p>
              </button>
            ))}
            {paginatedFamilies.length === 0 ? <p className="px-4 py-6 text-sm text-slate-500">Nenhuma família encontrada.</p> : null}
          </div>

          {/* Desktop table */}
          <div className="flex-1 overflow-x-auto">
            <table className="hidden min-w-full divide-y divide-slate-100 text-sm md:table">
              <thead className="bg-sky-50/70 text-left text-xs uppercase tracking-wide text-sky-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Família</th>
                  <th className="px-4 py-3 font-semibold">Código</th>
                  <th className="px-4 py-3 font-semibold">Responsável</th>
                  <th className="px-4 py-3 font-semibold">Alunos</th>
                  <th className="px-4 py-3 font-semibold">Bairro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedFamilies.map((family) => (
                  <tr
                    key={family.id}
                    className="cursor-pointer hover:bg-slate-50/70"
                    onClick={() => openFamilyPopup(family)}
                  >
                    <td className="px-4 py-3 font-semibold text-slate-900">{family.family_name}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-sky-700">{family.family_code}</td>
                    <td className="px-4 py-3 text-slate-700">{family.responsible?.full_name || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{family.students.length}</td>
                    <td className="px-4 py-3 text-slate-500">{family.neighborhood || '-'}</td>
                  </tr>
                ))}
                {paginatedFamilies.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-500" colSpan={5}>Nenhuma família encontrada.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <PaginationControls
            totalItems={filteredRows.length}
            page={currentPage}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(nextSize) => {
              setPageSize(nextSize)
              setPage(1)
            }}
          />
        </section>
      ) : null}

      {/* Family detail popup */}
      {popupFamily ? (
        <FamilyPopup
          family={popupFamily}
          onClose={() => setPopupFamily(null)}
          onMinimize={() => {
            setMinimizedItems((prev) => {
              if (prev.some((item) => item.id === popupFamily.id)) return prev
              return [...prev, popupFamily]
            })
            setPopupFamily(null)
          }}
          onEdit={() => openEditFamilyModal(popupFamily)}
          onAddStudent={() => openAddStudentModal(popupFamily)}
          onEditStudent={(student) => openEditStudentModal(student, popupFamily.id)}
          onDeleteFamily={() => setDeleteTarget({ type: 'family', id: popupFamily.id, name: popupFamily.family_name })}
          onDeleteStudent={(student) => setDeleteTarget({ type: 'student', id: student.id, name: student.full_name })}
        />
      ) : null}

      {/* Minimized items queue */}
      <MinimizedQueue
        items={minimizedItems.map((f) => ({ id: f.id, label: f.family_name, sub: `${f.students.length} aluno(s)` }))}
        onOpen={(id) => {
          const family = minimizedItems.find((f) => f.id === id) || rows.find((f) => f.id === id)
          if (family) openFamilyPopup(family)
        }}
        onClose={(id) => setMinimizedItems((prev) => prev.filter((item) => item.id !== id))}
      />

      {/* Family create/edit modal */}
      {isFamilyModalOpen ? (
        <FamilyModal
          form={familyForm}
          onChange={setFamilyForm}
          onCancel={() => setIsFamilyModalOpen(false)}
          onSave={saveFamily}
        />
      ) : null}

      {/* Student create/edit modal */}
      {isStudentModalOpen ? (
        <StudentModal
          form={studentForm}
          onChange={setStudentForm}
          onCancel={() => setIsStudentModalOpen(false)}
          onSave={saveStudent}
        />
      ) : null}

      {/* Delete confirmation modal */}
      {deleteTarget ? (
        <ConfirmDeleteModal
          title={deleteTarget.type === 'family' ? 'Excluir família' : 'Excluir aluno'}
          description={
            deleteTarget.type === 'family'
              ? `Tem certeza que deseja excluir a família "${deleteTarget.name}" e todos os seus dados? Esta ação não pode ser desfeita.`
              : `Tem certeza que deseja excluir o aluno "${deleteTarget.name}"? Esta ação não pode ser desfeita.`
          }
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      ) : null}
    </AppShell>
  )
}

function FamilyPopup({ family, onClose, onMinimize, onEdit, onAddStudent, onEditStudent, onDeleteFamily, onDeleteStudent }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl">
        {/* Popup header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{family.family_name}</h3>
            <p className="text-xs font-semibold text-sky-700">{family.family_code}</p>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={onEdit} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-50">
              <span className="inline-flex items-center gap-1"><Pencil className="h-3.5 w-3.5" /> Editar</span>
            </button>
            <button type="button" onClick={onMinimize} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="Minimizar">
              <Minus className="h-4 w-4" />
            </button>
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="Fechar">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Popup content */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Family info */}
            <section className="rounded-xl border border-slate-200 p-3 text-sm">
              <h4 className="mb-2 font-semibold text-slate-900">Dados da família</h4>
              <p><strong>Endereço:</strong> {family.address}{family.number ? `, ${family.number}` : ''}</p>
              <p><strong>Complemento:</strong> {family.complement || '-'}</p>
              <p><strong>Bairro:</strong> {family.neighborhood || '-'}</p>
              <p><strong>Cidade:</strong> {family.city || '-'}</p>
              <p><strong>CEP:</strong> {family.zip_code || '-'}</p>
              {family.has_scholarship ? (
                <p className="mt-1"><span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">Com bolsa</span> {family.scholarship_notes || ''}</p>
              ) : null}
              {family.notes ? <p className="mt-1 text-xs text-slate-500">{family.notes}</p> : null}
            </section>

            {/* Responsible info */}
            <section className="rounded-xl border border-slate-200 p-3 text-sm">
              <h4 className="mb-2 font-semibold text-slate-900">Responsável principal</h4>
              <p><strong>Nome:</strong> {family.responsible?.full_name || '-'}</p>
              <p><strong>CPF:</strong> {formatCpf(family.responsible?.cpf)}</p>
              <p><strong>E-mail:</strong> {family.responsible?.email || '-'}</p>
              <p><strong>Telefone:</strong> {family.responsible?.phone || '-'}</p>
              <p><strong>Financeiro:</strong> {family.responsible?.is_financial_responsible ? 'Sim' : 'Não'}</p>
              <p><strong>Retirada:</strong> {family.responsible?.pickup_authorized ? 'Autorizada' : 'Não autorizada'}</p>
              {family.responsible?.notes ? <p className="mt-1 text-xs text-slate-500">{family.responsible.notes}</p> : null}
            </section>
          </div>

          {/* Students */}
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="font-semibold text-slate-900">Alunos ({family.students.length})</h4>
              <button type="button" className="rounded-lg bg-sky-700 px-2.5 py-1.5 text-xs font-semibold text-white" onClick={onAddStudent}>
                <span className="inline-flex items-center gap-1"><Plus className="h-3.5 w-3.5" /> Adicionar aluno</span>
              </button>
            </div>
            <div className="space-y-2">
              {family.students.map((student) => (
                <div key={student.id} className="flex items-start justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                  <div>
                    <p className="font-semibold text-slate-900">{student.full_name}</p>
                    <p className="text-xs text-slate-500">{student.segment} - {student.class_name} - {student.shift} - {student.modality}</p>
                    <p className="text-xs text-slate-500">Nascimento: {student.birth_date || '-'}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button type="button" className="rounded-lg border border-slate-200 px-2 py-1 text-xs" onClick={() => onEditStudent(student)}>Editar</button>
                    <button type="button" className="rounded-lg border border-rose-200 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50" onClick={() => onDeleteStudent(student)}>
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
              {family.students.length === 0 ? <p className="text-sm text-slate-500">Nenhum aluno cadastrado.</p> : null}
            </div>
          </div>

          {/* Danger zone */}
          <div className="mt-6 border-t border-rose-100 pt-4">
            <button type="button" onClick={onDeleteFamily} className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50">
              <span className="inline-flex items-center gap-1"><Trash2 className="h-3.5 w-3.5" /> Excluir família</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function FamilyModal({ form, onChange, onCancel, onSave }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h3 className="text-lg font-semibold">{form.familyId ? 'Editar família e responsável' : 'Nova família'}</h3>
          <button type="button" onClick={onCancel} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <h4 className="md:col-span-2 text-sm font-semibold text-slate-900">Dados da família</h4>
            <Input label="Nome da família" value={form.family.family_name} onChange={(value) => onChange({ ...form, family: { ...form.family, family_name: value } })} />
            <Input label="Endereço" value={form.family.address} onChange={(value) => onChange({ ...form, family: { ...form.family, address: value } })} />
            <Input label="Número" value={form.family.number} onChange={(value) => onChange({ ...form, family: { ...form.family, number: value } })} />
            <Input label="Complemento" value={form.family.complement} onChange={(value) => onChange({ ...form, family: { ...form.family, complement: value } })} />
            <Input label="CEP" value={form.family.zip_code} onChange={(value) => onChange({ ...form, family: { ...form.family, zip_code: value } })} />
            <Input label="Cidade" value={form.family.city} onChange={(value) => onChange({ ...form, family: { ...form.family, city: value } })} />
            <Input label="Bairro" value={form.family.neighborhood} onChange={(value) => onChange({ ...form, family: { ...form.family, neighborhood: value } })} />
            <label className="text-sm text-slate-700"><input type="checkbox" className="mr-2" checked={form.family.has_scholarship ?? false} onChange={(event) => onChange({ ...form, family: { ...form.family, has_scholarship: event.target.checked } })} />Família com bolsa</label>
            <Input label="Detalhe da bolsa" value={form.family.scholarship_notes || ''} onChange={(value) => onChange({ ...form, family: { ...form.family, scholarship_notes: value } })} />
            <Input label="Observações" value={form.family.notes} onChange={(value) => onChange({ ...form, family: { ...form.family, notes: value } })} />

            <h4 className="md:col-span-2 mt-2 text-sm font-semibold text-slate-900">Responsável principal</h4>
            <Input label="Nome completo" value={form.responsible.full_name} onChange={(value) => onChange({ ...form, responsible: { ...form.responsible, full_name: value } })} />
            <Input label="CPF" value={form.responsible.cpf} onChange={(value) => onChange({ ...form, responsible: { ...form.responsible, cpf: value } })} />
            <Input label="E-mail" value={form.responsible.email} onChange={(value) => onChange({ ...form, responsible: { ...form.responsible, email: value } })} />
            <Input label="Telefone" value={form.responsible.phone} onChange={(value) => onChange({ ...form, responsible: { ...form.responsible, phone: value } })} />
            <Input label="Observações" value={form.responsible.notes} onChange={(value) => onChange({ ...form, responsible: { ...form.responsible, notes: value } })} />
            <label className="text-sm text-slate-700"><input type="checkbox" className="mr-2" checked={form.responsible.is_financial_responsible} onChange={(event) => onChange({ ...form, responsible: { ...form.responsible, is_financial_responsible: event.target.checked } })} />Responsável financeiro</label>
            <label className="text-sm text-slate-700"><input type="checkbox" className="mr-2" checked={form.responsible.pickup_authorized} onChange={(event) => onChange({ ...form, responsible: { ...form.responsible, pickup_authorized: event.target.checked } })} />Autorizado para retirada</label>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <button type="button" className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm" onClick={onCancel}>Cancelar</button>
          <button type="button" className="rounded-lg bg-sky-700 px-3 py-1.5 text-sm font-semibold text-white" onClick={onSave}>Salvar</button>
        </div>
      </div>
    </div>
  )
}

function StudentModal({ form, onChange, onCancel, onSave }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h3 className="text-lg font-semibold">{form.id ? 'Editar aluno' : 'Novo aluno'}</h3>
          <button type="button" onClick={onCancel} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Nome completo*" value={form.full_name} onChange={(value) => onChange({ ...form, full_name: value })} />
            <Input label="CPF" value={form.cpf} onChange={(value) => onChange({ ...form, cpf: value })} />
            <Input label="Data de nascimento*" type="date" value={form.birth_date} onChange={(value) => onChange({ ...form, birth_date: value })} />
            <Input label="Ano de entrada*" type="number" value={form.ano_entrada} onChange={(value) => onChange({ ...form, ano_entrada: Number(value) })} />
            <Input label="Turma*" value={form.class_name} onChange={(value) => onChange({ ...form, class_name: value })} />
            <label className="text-sm text-slate-700"><input type="checkbox" className="mr-2" checked={form.has_scholarship ?? false} onChange={(event) => onChange({ ...form, has_scholarship: event.target.checked })} />Aluno com bolsa</label>
            <Input label="Tipo de bolsa" value={form.scholarship_type || ''} onChange={(value) => onChange({ ...form, scholarship_type: value })} />
            <Select label="Segmento*" value={form.segment} options={STUDENT_SEGMENTS} onChange={(value) => onChange({ ...form, segment: value })} />
            <Select label="Turno*" value={form.shift} options={STUDENT_SHIFTS} onChange={(value) => onChange({ ...form, shift: value })} />
            <Select label="Modalidade*" value={form.modality} options={STUDENT_MODALITIES} onChange={(value) => onChange({ ...form, modality: value })} />
            <label className="text-sm text-slate-700"><input type="checkbox" className="mr-2" checked={form.active_status} onChange={(event) => onChange({ ...form, active_status: event.target.checked })} />Aluno ativo</label>
            <Input label="Alergias" value={form.allergies} onChange={(value) => onChange({ ...form, allergies: value })} />
            <Input label="Restrições alimentares" value={form.dietary_restrictions} onChange={(value) => onChange({ ...form, dietary_restrictions: value })} />
            <Input label="Observações de retirada" value={form.authorized_pickup_notes} onChange={(value) => onChange({ ...form, authorized_pickup_notes: value })} />
            <Input label="Observações gerais" value={form.notes} onChange={(value) => onChange({ ...form, notes: value })} />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <button type="button" className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm" onClick={onCancel}>Cancelar</button>
          <button type="button" className="rounded-lg bg-sky-700 px-3 py-1.5 text-sm font-semibold text-white" onClick={onSave}>Salvar aluno</button>
        </div>
      </div>
    </div>
  )
}

function Input({ label, value, onChange, type = 'text', disabled = false }) {
  return (
    <label className="text-sm text-slate-700">
      <span className="mb-1 block">{label}</span>
      <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100" type={type} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} />
    </label>
  )
}

function Select({ label, value, options, onChange }) {
  return (
    <label className="text-sm text-slate-700">
      <span className="mb-1 block">{label}</span>
      <select className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-8 text-sm" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  )
}
