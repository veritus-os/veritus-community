/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from 'react'
import { Minus, X } from 'lucide-react'
import { schoolCrudService } from '../core/services/repositoryRegistry'

const EntityInfoContext = createContext(null)

export function EntityInfoProvider({ children }) {
  const [cards, setCards] = useState([])

  async function buildStudentPayload(studentId) {
    const [students, families] = await Promise.all([
      schoolCrudService.listStudents(),
      schoolCrudService.listFamiliesDetailed(),
    ])
    const student = students.find((item) => Number(item.id) === Number(studentId))
    if (!student) throw new Error('Aluno não encontrado.')
    const family = families.find((item) => Number(item.id) === Number(student.family_id))
    return {
      key: `student-${student.id}`,
      title: `Aluno: ${student.full_name}`,
      student,
      family: family || null,
      responsible: family?.responsible || null,
      minimized: false,
    }
  }

  async function buildFamilyPayload(familyId) {
    const family = await schoolCrudService.getFamilyDetail(familyId)
    if (!family) throw new Error('Família não encontrada.')
    return {
      key: `family-${family.id}`,
      title: `Família: ${family.family_name}`,
      student: null,
      family,
      responsible: family?.responsible || null,
      minimized: false,
    }
  }

  function upsertCard(nextCard) {
    setCards((current) => {
      const exists = current.find((item) => item.key === nextCard.key)
      if (!exists) return [...current, nextCard]
      return [...current.filter((item) => item.key !== nextCard.key), { ...exists, ...nextCard, minimized: false }]
    })
  }

  async function openStudentInfo(studentId) {
    const payload = await buildStudentPayload(studentId)
    upsertCard(payload)
  }

  async function openFamilyInfo(familyId) {
    const payload = await buildFamilyPayload(familyId)
    upsertCard(payload)
  }

  function minimizeCard(key) {
    setCards((current) =>
      current.map((item) => (item.key === key ? { ...item, minimized: true } : item)),
    )
  }

  function restoreCard(key) {
    setCards((current) => {
      const target = current.find((item) => item.key === key)
      if (!target) return current
      const other = current.filter((item) => item.key !== key)
      return [...other, { ...target, minimized: false }]
    })
  }

  function closeCard(key) {
    setCards((current) => current.filter((item) => item.key !== key))
  }

  const activeCard = [...cards].reverse().find((item) => !item.minimized) || null
  const minimizedCards = cards.filter((item) => item.minimized)

  const value = {
    openStudentInfo,
    openFamilyInfo,
    hasOpenCard: Boolean(activeCard) || minimizedCards.length > 0,
  }

  return (
    <EntityInfoContext.Provider value={value}>
      {children}

      {activeCard ? (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="pointer-events-auto w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <h3 className="text-base font-semibold text-slate-900">{activeCard.title}</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700"
                  onClick={() => minimizeCard(activeCard.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    <Minus className="h-3.5 w-3.5" /> Minimizar
                  </span>
                </button>
                <button
                  type="button"
                  className="rounded-full border border-slate-200 p-1.5 text-slate-600"
                  onClick={() => closeCard(activeCard.key)}
                  aria-label="Fechar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-3">
              <InfoGroup title="Aluno">
                <InfoLine label="Nome" value={activeCard.student?.full_name || '-'} />
                <InfoLine label="Turma" value={activeCard.student?.class_name || '-'} />
                <InfoLine label="Segmento" value={activeCard.student?.segment || '-'} />
                <InfoLine label="Turno" value={activeCard.student?.shift || '-'} />
              </InfoGroup>

              <InfoGroup title="Família">
                <InfoLine label="Código" value={activeCard.family?.family_code || '-'} />
                <InfoLine label="Nome" value={activeCard.family?.family_name || '-'} />
                <InfoLine label="Bairro" value={activeCard.family?.neighborhood || '-'} />
                <InfoLine label="Cidade" value={activeCard.family?.city || '-'} />
              </InfoGroup>

              <InfoGroup title="Responsável principal">
                <InfoLine label="Nome" value={activeCard.responsible?.full_name || '-'} />
                <InfoLine label="Telefone" value={activeCard.responsible?.phone || '-'} />
                <InfoLine label="E-mail" value={activeCard.responsible?.email || '-'} />
                <InfoLine label="Financeiro" value={activeCard.responsible?.is_financial_responsible ? 'Sim' : 'Não'} />
              </InfoGroup>
            </div>
          </div>
        </div>
      ) : null}

      {minimizedCards.length > 0 ? (
        <div className="fixed bottom-4 right-4 z-50 flex max-w-[300px] flex-col gap-2">
          {minimizedCards.map((item) => (
            <div key={item.key} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg">
              <button
                type="button"
                className="text-left text-xs font-semibold text-slate-800"
                onClick={() => restoreCard(item.key)}
              >
                {item.title}
              </button>
              <button
                type="button"
                className="rounded-full p-1 text-slate-500 hover:bg-slate-100"
                onClick={() => closeCard(item.key)}
                aria-label="Fechar"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </EntityInfoContext.Provider>
  )
}

function InfoGroup({ title, children }) {
  return (
    <section className="rounded-xl border border-slate-100 bg-slate-50 p-3">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">{title}</h4>
      <div className="space-y-1.5">{children}</div>
    </section>
  )
}

function InfoLine({ label, value }) {
  return (
    <p className="text-xs text-slate-700">
      <strong className="font-semibold text-slate-900">{label}:</strong> {value}
    </p>
  )
}

export function useEntityInfo() {
  const context = useContext(EntityInfoContext)
  if (!context) {
    throw new Error('useEntityInfo deve ser usado dentro de EntityInfoProvider.')
  }
  return context
}
