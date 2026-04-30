import { useEffect, useMemo, useState } from 'react'
import { FileText, FolderOpen } from 'lucide-react'
import AppShell from '../components/AppShell'
import { ErrorBox, LoadingRow, MissingConfig } from '../components/UiState'
import { hasSupabaseConfig, supabase } from '../lib/supabaseClient'

export default function ProfessoresPage() {
  const [teachers, setTeachers] = useState([])
  const [contents, setContents] = useState([])
  const [activeTeacherId, setActiveTeacherId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadData() {
      if (!hasSupabaseConfig || !supabase) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const [teachersRes, contentsRes] = await Promise.all([
          supabase.from('teachers').select('id,full_name,subject_area,email,active').eq('active', true).order('full_name', { ascending: true }),
          supabase.from('teacher_contents').select('id,teacher_id,title,description,file_url,status,created_at').order('created_at', { ascending: false }),
        ])

        if (teachersRes.error) throw teachersRes.error
        if (contentsRes.error) throw contentsRes.error

        const teachersData = teachersRes.data ?? []
        setTeachers(teachersData)
        setContents(contentsRes.data ?? [])
        setActiveTeacherId((previous) => previous ?? teachersData[0]?.id ?? null)
      } catch (err) {
        setError(err.message ?? 'Nao foi possivel carregar os professores.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const teacherContents = useMemo(
    () => contents.filter((item) => item.teacher_id === activeTeacherId),
    [contents, activeTeacherId],
  )

  const selectedTeacher = useMemo(
    () => teachers.find((teacher) => teacher.id === activeTeacherId) ?? null,
    [teachers, activeTeacherId],
  )

  return (
    <AppShell
      title="Professores"
      subtitle="Acompanhe os planejamentos pedagógicos e arquivos enviados por cada professor."
    >
      {!hasSupabaseConfig ? <MissingConfig /> : null}
      <ErrorBox message={error} />

      <section className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <article className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="text-base font-semibold text-slate-900">Lista de professores</h3>
          </div>
          {loading ? (
            <LoadingRow text="Carregando professores..." />
          ) : (
            <div className="max-h-[620px] overflow-y-auto">
              {teachers.map((teacher) => (
                <button
                  type="button"
                  key={teacher.id}
                  onClick={() => setActiveTeacherId(teacher.id)}
                  className={`w-full border-b border-slate-100 px-5 py-4 text-left transition hover:bg-slate-50 ${
                    activeTeacherId === teacher.id ? 'bg-sky-50' : ''
                  }`}
                >
                  <p className="font-semibold text-slate-900">{teacher.full_name}</p>
                  <p className="text-xs text-slate-500">{teacher.subject_area || 'Area nao informada'}</p>
                  <p className="mt-1 text-xs text-sky-700">{teacher.email}</p>
                </button>
              ))}
              {teachers.length === 0 ? (
                <p className="px-5 py-6 text-sm text-slate-500">Nenhum professor cadastrado.</p>
              ) : null}
            </div>
          )}
        </article>

        <article className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="text-base font-semibold text-slate-900">Planejamento pedagógico e repositório</h3>
            <p className="mt-1 text-sm text-slate-600">
              {selectedTeacher
                ? `Arquivos de ${selectedTeacher.full_name}`
                : 'Selecione um professor para visualizar os conteúdos.'}
            </p>
          </div>

          {loading ? (
            <LoadingRow text="Carregando planejamentos..." />
          ) : (
            <div className="space-y-3 p-5">
              {teacherContents.map((item) => (
                <article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-sky-700" />
                      <p className="font-semibold text-slate-900">{item.title}</p>
                    </div>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        item.status === 'publicado'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {item.status === 'publicado' ? 'Publicado' : 'Rascunho'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">{item.description || 'Sem descrição.'}</p>
                  <div className="mt-3 flex items-center gap-2 text-sm">
                    <FolderOpen className="h-4 w-4 text-sky-700" />
                    <a
                      href={item.file_url || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-sky-700 hover:text-sky-800"
                    >
                      Abrir arquivo
                    </a>
                  </div>
                </article>
              ))}
              {!selectedTeacher ? (
                <p className="text-sm text-slate-500">Selecione um professor na lista ao lado.</p>
              ) : null}
              {selectedTeacher && teacherContents.length === 0 ? (
                <p className="text-sm text-slate-500">Este professor ainda não possui arquivos enviados.</p>
              ) : null}
            </div>
          )}
        </article>
      </section>
    </AppShell>
  )
}
