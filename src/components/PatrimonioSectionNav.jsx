import ModuleSectionNav from './ModuleSectionNav'

const ITEMS = [
  { to: '/patrimonio', label: 'Escola', end: true },
  { to: '/patrimonio/biblioteca', label: 'Biblioteca', end: true },
]

export default function PatrimonioSectionNav() {
  return <ModuleSectionNav items={ITEMS} />
}
