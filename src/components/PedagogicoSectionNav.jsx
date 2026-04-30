import ModuleSectionNav from './ModuleSectionNav'

export default function PedagogicoSectionNav() {
  return (
    <ModuleSectionNav
      items={[
        { to: '/pedagogico', label: 'Presença por Turma', end: true },
        { to: '/pedagogico/relatorios', label: 'Relatórios de Aula' },
        { to: '/pedagogico/planejamento', label: 'Planejamento Pedagógico' },
        { to: '/pedagogico/arquivados', label: 'Arquivados' },
      ]}
    />
  )
}
