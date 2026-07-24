import { useEffect } from 'react'
import { useModule } from '../core/config/moduleContext'

// Composes the browser tab title as "<módulo> · Colégio Alta Vista" so staff
// with several tabs open can tell them apart; falls back to the school name
// alone on the hub. The static base title lives in index.html for pre-hydration.
const SEG = { checkout: 'Saída de Alunos', search: 'Secretaria' }

export default function DocumentTitle() {
  const mod = useModule()
  useEffect(() => {
    const seg = SEG[mod.id]
    document.title = seg ? `${seg} · Colégio Alta Vista` : 'Colégio Alta Vista'
  }, [mod.id])
  return null
}
