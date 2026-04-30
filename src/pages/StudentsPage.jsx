import { useEffect, useMemo, useState } from 'react'
import { Download, Minus, Plus, Search, Tag, X } from 'lucide-react'
import AppShell from '../components/AppShell'
import ClearFiltersButton from '../components/ClearFiltersButton'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import MinimizedQueue from '../components/MinimizedQueue'
import PaginationControls from '../components/PaginationControls'
import { ErrorBox, LoadingRow } from '../components/UiState'
import { createEmptyStudent, EXTRACURRICULAR_OPTIONS, STUDENT_MODALITIES, STUDENT_SEGMENTS, STUDENT_SHIFTS } from '../core/models/schoolModels'
import { schoolCrudService, spreadsheetExportService } from '../core/services/repositoryRegistry'

const defaultFilters = {
  segment: 'todos',
  class_name: 'todas',
  shift: 'todos',
  modality: 'todos',
  active_status: 'todos',
  scholarship: 'todos',
}

const TAG_CATEGORIES = ['bolsa', 'alimentação', 'evento', 'histórico', 'observação', 'administrativo']

export default function StudentsPage() {
  const [rows, setRows] = useState([])
  const [families, setFamilies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState(defaultFilters)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // Popup state — queue support
  const [popupStudent, setPopupStudent] = useState(null)
  const [minimizedItems, setMinimizedItems] = useState([])

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState(null)

  // Edit modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ ...createEmptyStudent(), id: null })

  // Tag state
  const [tagRegistry, setTagRegistry] = useState([])
  const [newTag, setNewTag] = useState('')
  const [newTagCategory, setNewTagCategory] = useState('observacao')
  const [selectedRegistryTag, setSelectedRegistryTag] = useState('nova')

  async function loadData(appliedFilters = filters) {
    setLoading(true)
    try {
      const [students, familyRows, registry] = await Promise.all([
        schoolCrudService.listStudents(appliedFilters),
        schoolCrudService.listFamiliesDetailed(),
        schoolCrudService.listTagRegistry(),
      ])
      setRows(students)
      setFamilies(familyRows)
      setTagRegistry(registry)
      setPage(1)
    } catch (err) {
      setError(err.message ?? 'Não foi possível carregar alunos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData(defaultFilters)
  }, [])

  // Sync popup student with latest data
  useEffect(() => {
    if (popupStudent) {
      const updated = rows.find((r) => r.id === popupStudent.id)
      if (updated) setPopupStudent(updated)
    }
  }, [rows])

  const filteredRows = useMemo(() => {
    const search = searchTerm.trim().toLowerCase()
    return rows.filter((row) => {
      if (!search) return true
      return (
        String(row.full_name || '').toLowerCase().includes(search) ||
        String(row.family?.family_name || '').toLowerCase().includes(search) ||
        String(row.class_name || '').toLowerCase().includes(search) ||
        row.tags.some((tag) => String(tag.tag || '').toLowerCase().includes(search))
      )
    })
  }, [rows, searchTerm])

  const allClasses = useMemo(() => {
    const values = [...new Set(rows.map((row) => row.class_name).filter(Boolean))]
    return values.sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [rows])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paginatedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  function openStudentPopup(student) {
    if (popupStudent && popupStudent.id !== student.id) {
      setMinimizedItems((prev) => {
        if (prev.some((item) => item.id === popupStudent.id)) return prev
        return [...prev, popupStudent]
      })
    }
    setMinimizedItems((prev) => prev.filter((item) => item.id !== student.id))
    setPopupStudent(student)
  }

  function openEditFromPopup() {
    if (!popupStudent) return
    setForm({ ...popupStudent, id: popupStudent.id, family_id: popupStudent.family_id })
    setModalOpen(true)
  }

  async function saveStudent() {
    try {
      await schoolCrudService.updateStudent(form.id, form)
      setModalOpen(false)
      await loadData()
    } catch (err) {
      setError(err.message ?? 'Erro ao salvar aluno.')
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    try {
      await schoolCrudService.deleteStudent(deleteTarget.id)
      if (popupStudent?.id === deleteTarget.id) setPopupStudent(null)
      setMinimizedItems((prev) => prev.filter((item) => item.id !== deleteTarget.id))
      setDeleteTarget(null)
      await loadData()
    } catch (err) {
      setError(err.message ?? 'Erro ao excluir aluno.')
      setDeleteTarget(null)
    }
  }

  async function addTag() {
    if (!popupStudent || !newTag.trim()) return
    try {
      await schoolCrudService.addStudentTag(popupStudent.id, {
        tag: newTag.trim(),
        category: newTagCategory,
      })
      setNewTag('')
      setNewTagCategory('observacao')
      setSelectedRegistryTag('nova')
      await loadData()
    } catch (err) {
      setError(err.message ?? 'Erro ao adicionar tag.')
    }
  }

  async function removeTag(tagId) {
    await schoolCrudService.removeStudentTag(tagId)
    await loadData()
  }

  return (
    <AppShell
      title="Alunos"
      subtitle="Gestão acadêmica. Novos alunos devem ser criados em Famílias."
    >
      <ErrorBox message={error} />

      <section className="mb-4 flex flex-wrap items-center gap-2">
        <button type="button" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700" onClick={() => spreadsheetExportService.exportCsv()}>
          <span className="inline-flex items-center gap-1"><Download className="h-4 w-4" /> Exportar</span>
        </button>
        <span className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
          Cadastro de aluno: Familias &rarr; Detalhes &rarr; Adicionar aluno
        </span>
      </section>

      {/* Filters - simplified */}
      <section className="mb-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-4">
        <div className="relative md:col-span-2">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            className="w-full rounded-lg border border-slate-200 px-8 py-2 text-sm"
            placeholder="Aluno, família, turma ou tag"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
        <FilterSelect label="Segmento" value={filters.segment} onChange={(value) => setFilters((prev) => ({ ...prev, segment: value }))}>
          <option value="todos">Todos</option>
          {STUDENT_SEGMENTS.map((item) => <option key={item} value={item}>{item}</option>)}
        </FilterSelect>
        <FilterSelect label="Turma" value={filters.class_name} onChange={(value) => setFilters((prev) => ({ ...prev, class_name: value }))}>
          <option value="todas">Todas</option>
          {allClasses.map((item) => <option key={item} value={item}>{item}</option>)}
        </FilterSelect>
        <FilterSelect label="Turno" value={filters.shift} onChange={(value) => setFilters((prev) => ({ ...prev, shift: value }))}>
          <option value="todos">Todos</option>
          {STUDENT_SHIFTS.map((item) => <option key={item} value={item}>{item}</option>)}
        </FilterSelect>
        <FilterSelect label="Status" value={filters.active_status} onChange={(value) => setFilters((prev) => ({ ...prev, active_status: value }))}>
          <option value="todos">Todos</option>
          <option value="ativos">Ativos</option>
          <option value="inativos">Inativos</option>
        </FilterSelect>
        <FilterSelect label="Bolsa" value={filters.scholarship} onChange={(value) => setFilters((prev) => ({ ...prev, scholarship: value }))}>
          <option value="todos">Todos</option>
          <option value="com_bolsa">Com bolsa</option>
          <option value="sem_bolsa">Sem bolsa</option>
        </FilterSelect>
        <div className="flex items-end gap-2">
          <button type="button" className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white" onClick={() => loadData(filters)}>
            Filtrar
          </button>
          <ClearFiltersButton onClick={() => { setSearchTerm(''); setFilters(defaultFilters); loadData(defaultFilters) }} />
        </div>
      </section>

      {loading ? <LoadingRow text="Carregando alunos..." /> : null}

      {!loading ? (
        <section className="flex min-h-[560px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex-1 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-sky-50/70 text-left text-xs uppercase tracking-wide text-sky-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Aluno</th>
                  <th className="hidden px-4 py-3 font-semibold md:table-cell">Família</th>
                  <th className="hidden px-4 py-3 font-semibold md:table-cell">Turma</th>
                  <th className="hidden px-4 py-3 font-semibold md:table-cell">Tags</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedRows.map((row) => (
                  <tr
                    key={row.id}
                    className="cursor-pointer hover:bg-slate-50/70"
                    onClick={() => openStudentPopup(row)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{row.full_name}</p>
                      <p className="text-xs text-slate-500">{row.segment} - {row.shift} - {row.modality}</p>
                      <p className="text-xs text-slate-500 md:hidden">{row.family?.family_name || '-'} - {row.class_name}</p>
                    </td>
                    <td className="hidden px-4 py-3 text-slate-700 md:table-cell">{row.family?.family_name || '-'}</td>
                    <td className="hidden px-4 py-3 text-slate-700 md:table-cell">{row.class_name}</td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {row.tags.slice(0, 3).map((tag) => (
                          <span key={tag.id} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                            {tag.tag}
                          </span>
                        ))}
                        {row.tags.length > 3 ? <span className="text-[11px] text-slate-400">+{row.tags.length - 3}</span> : null}
                      </div>
                    </td>
                  </tr>
                ))}
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-500" colSpan={4}>Nenhum aluno encontrado.</td>
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

      {/* Student popup */}
      {popupStudent ? (
        <StudentPopup
          student={popupStudent}
          family={families.find((f) => f.id === popupStudent.family_id) ?? null}
          tagRegistry={tagRegistry}
          newTag={newTag}
          newTagCategory={newTagCategory}
          selectedRegistryTag={selectedRegistryTag}
          onClose={() => setPopupStudent(null)}
          onMinimize={() => {
            setMinimizedItems((prev) => {
              if (prev.some((item) => item.id === popupStudent.id)) return prev
              return [...prev, popupStudent]
            })
            setPopupStudent(null)
          }}
          onEdit={openEditFromPopup}
          onDelete={() => setDeleteTarget({ id: popupStudent.id, name: popupStudent.full_name })}
          onAddTag={addTag}
          onRemoveTag={removeTag}
          onNewTagChange={setNewTag}
          onNewTagCategoryChange={setNewTagCategory}
          onSelectedRegistryTagChange={(val) => {
            setSelectedRegistryTag(val)
            if (val === 'nova') return
            const selected = tagRegistry.find((item) => String(item.id) === val)
            if (!selected) return
            setNewTag(selected.tag)
            setNewTagCategory(selected.category)
          }}
        />
      ) : null}

      {/* Minimized items queue */}
      <MinimizedQueue
        items={minimizedItems.map((s) => ({ id: s.id, label: s.full_name, sub: s.class_name }))}
        onOpen={(id) => {
          const student = minimizedItems.find((s) => s.id === id) || rows.find((s) => s.id === id)
          if (student) openStudentPopup(student)
        }}
        onClose={(id) => setMinimizedItems((prev) => prev.filter((item) => item.id !== id))}
      />

      {/* Delete confirmation */}
      {deleteTarget ? (
        <ConfirmDeleteModal
          title="Excluir aluno"
          description={`Tem certeza que deseja excluir o aluno "${deleteTarget.name}"? Esta ação não pode ser desfeita.`}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      ) : null}

      {/* Edit modal */}
      {modalOpen ? (
        <StudentFormModal
          form={form}
          families={families}
          onChange={setForm}
          onCancel={() => setModalOpen(false)}
          onSave={saveStudent}
        />
      ) : null}
    </AppShell>
  )
}

function StudentPopup({ student, family, tagRegistry, newTag, newTagCategory, selectedRegistryTag, onClose, onMinimize, onEdit, onDelete, onAddTag, onRemoveTag, onNewTagChange, onNewTagCategoryChange, onSelectedRegistryTagChange }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{student.full_name}</h3>
            <p className="text-xs text-slate-500">{student.segment} - {student.class_name} - {student.shift}</p>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={onEdit} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-50">Editar</button>
            <button type="button" onClick={onMinimize} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" title="Minimizar">
              <Minus className="h-4 w-4" />
            </button>
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" title="Fechar">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Student info */}
            <section className="rounded-xl border border-slate-200 p-3 text-sm">
              <h4 className="mb-2 font-semibold text-slate-900">Dados do aluno</h4>
              <p><strong>Nascimento:</strong> {student.birth_date || '-'}</p>
              <p><strong>Modalidade:</strong> {student.modality}</p>
              <p><strong>Ano entrada:</strong> {student.ano_entrada || '-'}</p>
              <p><strong>Status:</strong> {student.active_status ? 'Ativo' : 'Inativo'}</p>
              {student.has_scholarship ? <p><strong>Bolsa:</strong> {student.scholarship_type || 'Sim'}</p> : null}
              {student.allergies ? <p><strong>Alergias:</strong> {student.allergies}</p> : null}
              {student.dietary_restrictions ? <p><strong>Restrições:</strong> {student.dietary_restrictions}</p> : null}
              {student.notes ? <p className="mt-1 text-xs text-slate-500">{student.notes}</p> : null}
            </section>

            {/* Family info */}
            <section className="rounded-xl border border-slate-200 p-3 text-sm">
              <h4 className="mb-2 font-semibold text-slate-900">Família</h4>
              {family ? (
                <>
                  <p><strong>Nome:</strong> {family.family_name}</p>
                  <p><strong>Código:</strong> {family.family_code}</p>
                  <p><strong>Responsável:</strong> {family.responsible?.full_name || '-'}</p>
                  <p><strong>Telefone:</strong> {family.responsible?.phone || '-'}</p>
                  <p><strong>E-mail:</strong> {family.responsible?.email || '-'}</p>
                  <p><strong>Bairro:</strong> {family.neighborhood || '-'}</p>
                </>
              ) : (
                <p className="text-slate-500">Família não encontrada.</p>
              )}
            </section>
          </div>

          {/* Tags */}
          <div className="mt-4">
            <h4 className="mb-2 font-semibold text-slate-900">Tags e histórico</h4>
            <div className="flex flex-wrap gap-2">
              {student.tags.map((tag) => (
                <span key={tag.id} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                  <Tag className="h-3 w-3" />
                  {tag.tag}
                  <button type="button" className="ml-1 text-rose-500 hover:text-rose-700" onClick={() => onRemoveTag(tag.id)}>&times;</button>
                </span>
              ))}
              {student.tags.length === 0 ? <p className="text-sm text-slate-500">Sem tags.</p> : null}
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-4">
              <select
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                value={selectedRegistryTag}
                onChange={(event) => onSelectedRegistryTagChange(event.target.value)}
              >
                <option value="nova">Nova tag</option>
                {tagRegistry.map((item) => (
                  <option key={item.id} value={item.id}>{item.tag} ({item.category})</option>
                ))}
              </select>
              <input className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm" placeholder="Tag" value={newTag} onChange={(e) => onNewTagChange(e.target.value)} />
              <select className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm" value={newTagCategory} onChange={(e) => onNewTagCategoryChange(e.target.value)}>
                {TAG_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <button type="button" className="rounded-lg bg-sky-700 px-3 py-1.5 text-sm font-semibold text-white" onClick={onAddTag}>
                <span className="inline-flex items-center gap-1"><Plus className="h-4 w-4" /> Adicionar</span>
              </button>
            </div>
          </div>

          {/* Danger zone — delete separated from header actions */}
          <div className="mt-6 border-t border-rose-100 pt-4">
            <button type="button" onClick={onDelete} className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50">
              Excluir matrícula
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function FilterSelect({ label, value, onChange, children }) {
  return (
    <label className="text-sm text-slate-700">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <select className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 pr-8 text-sm" value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </label>
  )
}

function StudentFormModal({ form, families, onChange, onCancel, onSave }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h3 className="text-lg font-semibold">Editar aluno</h3>
          <button type="button" onClick={onCancel} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nome completo*" value={form.full_name} onChange={(value) => onChange({ ...form, full_name: value })} />
            <Field label="Data de nascimento*" type="date" value={form.birth_date} onChange={(value) => onChange({ ...form, birth_date: value })} />
            <Field label="Turma*" value={form.class_name} onChange={(value) => onChange({ ...form, class_name: value })} />
            <label className="text-sm text-slate-700">
              <span className="mb-1 block">Família*</span>
              <select className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-8 text-sm" value={form.family_id} onChange={(event) => onChange({ ...form, family_id: Number(event.target.value) })}>
                <option value="">Selecionar família</option>
                {families.map((family) => <option key={family.id} value={family.id}>{family.family_name}</option>)}
              </select>
            </label>
            <SelectField label="Segmento*" value={form.segment} options={STUDENT_SEGMENTS} onChange={(value) => onChange({ ...form, segment: value })} />
            <SelectField label="Turno*" value={form.shift} options={STUDENT_SHIFTS} onChange={(value) => onChange({ ...form, shift: value })} />
            <SelectField label="Modalidade*" value={form.modality} options={STUDENT_MODALITIES} onChange={(value) => onChange({ ...form, modality: value })} />
            <label className="text-sm text-slate-700">
              <input type="checkbox" className="mr-2" checked={form.has_scholarship ?? false} onChange={(event) => onChange({ ...form, has_scholarship: event.target.checked })} />
              Aluno com bolsa
            </label>
            <label className="text-sm text-slate-700">
              <input type="checkbox" className="mr-2" checked={form.active_status} onChange={(event) => onChange({ ...form, active_status: event.target.checked })} />
              Aluno ativo
            </label>
            <Field label="Alergias" value={form.allergies} onChange={(value) => onChange({ ...form, allergies: value })} />
            <Field label="Restrições alimentares" value={form.dietary_restrictions} onChange={(value) => onChange({ ...form, dietary_restrictions: value })} />
            <Field label="Observações" value={form.notes} onChange={(value) => onChange({ ...form, notes: value })} />
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

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <label className="text-sm text-slate-700">
      <span className="mb-1 block">{label}</span>
      <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" type={type} value={value ?? ''} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function SelectField({ label, value, options, onChange }) {
  return (
    <label className="text-sm text-slate-700">
      <span className="mb-1 block">{label}</span>
      <select className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-8 text-sm" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  )
}
