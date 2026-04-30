function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function compareByCode(a, b) {
  return String(a?.code || '').localeCompare(String(b?.code || ''), 'pt-BR', { numeric: true })
}

function isAnalytical(category) {
  return !!category && (category.kind || 'A') === 'A'
}

function isPostable(category) {
  return isAnalytical(category) && category.allow_posting !== false
}

function hasPrefix(category, prefix) {
  return String(category?.code || '').trim().startsWith(prefix)
}

export function getReceivableCategories(categories) {
  const list = Array.isArray(categories) ? categories : []
  const preferred = list.filter(
    (c) => isAnalytical(c) && (hasPrefix(c, '1.1.05.') || normalizeText(c.name).includes('a receber')),
  )
  if (preferred.length > 0) return [...preferred].sort(compareByCode)
  const currentAssets = list.filter((c) => isAnalytical(c) && hasPrefix(c, '1.1.'))
  if (currentAssets.length > 0) return [...currentAssets].sort(compareByCode)
  return []
}

export function getExpenseCategories(categories) {
  return (Array.isArray(categories) ? categories : [])
    .filter((c) => isAnalytical(c) && c.type === 'expense')
    .sort(compareByCode)
}

export function getIncomeCategories(categories) {
  return (Array.isArray(categories) ? categories : [])
    .filter((c) => isPostable(c) && hasPrefix(c, '4.'))
    .sort(compareByCode)
}

export function getCounterpartCategories(categories, recordType) {
  if (recordType === 'expense') {
    return getExpenseSettlementCategories(categories)
  }
  return getIncomeCategories(categories)
}

export function getPostableCategories(categories) {
  return (Array.isArray(categories) ? categories : [])
    .filter((c) => isAnalytical(c) && (hasPrefix(c, '4.') || hasPrefix(c, '5.')))
    .sort(compareByCode)
}

function getExpenseSettlementCategories(categories) {
  const list = Array.isArray(categories) ? categories : []
  const payable = list.filter(
    (c) =>
      isAnalytical(c) &&
      (hasPrefix(c, '2.1.01') ||
        normalizeText(c.name).includes('fornecedor') ||
        normalizeText(c.name).includes('a pagar')),
  )
  const liabilities =
    payable.length > 0
      ? [...payable].sort(compareByCode)
      : list.filter((c) => isAnalytical(c) && hasPrefix(c, '2.1.')).sort(compareByCode)

  const liquidity = list
    .filter(
      (c) =>
        isAnalytical(c) &&
        (hasPrefix(c, '1.1.01') ||
          hasPrefix(c, '1.1.02') ||
          hasPrefix(c, '1.1.03.') ||
          hasPrefix(c, '1.1.04.')),
    )
    .sort(compareByCode)

  const seen = new Set()
  return [...liabilities, ...liquidity].filter((c) => {
    const key = String(c.id || `${c.code}:${c.name}`)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function suggestCategoryCode(categories, description) {
  const list = Array.isArray(categories) ? categories : []
  const normalized = normalizeText(description)
  if (!normalized) return null

  const keywords = {
    mensalidade: '4.1.01',
    matricula: '4.1.02',
    material: '4.1.03',
    apostila: '4.1.03',
    extracurricular: '4.1.04',
    passeio: '4.1.05',
    excursao: '4.1.05',
    curso: '4.1.06',
    doacao: '4.2.01',
    cantina: '4.2.07',
    aluguel: '5.2.10',
    energia: '5.2.03',
    luz: '5.2.03',
    agua: '5.2.04',
    internet: '5.2.05',
    telefone: '5.2.06',
    telefonia: '5.2.06',
    salario: '5.2.01',
    limpeza: '5.3.02',
    manutencao: '5.3.01',
    alimentacao: '5.3.04',
    merenda: '5.3.04',
    combustivel: '5.3.06',
  }

  for (const [keyword, code] of Object.entries(keywords)) {
    if (normalized.includes(keyword)) {
      const found = list.find((c) => c.code === code)
      if (found) return found.code
    }
  }

  const fuzzy = list.find((c) => isAnalytical(c) && normalizeText(c.name).includes(normalized))
  if (fuzzy) return fuzzy.code

  return null
}

export function findCategoryByCode(categories, code) {
  if (!code) return null
  return (Array.isArray(categories) ? categories : []).find((c) => c.code === code) ?? null
}

export function findCategoryByName(categories, name) {
  const normalized = normalizeText(name)
  if (!normalized) return null
  return (Array.isArray(categories) ? categories : []).find(
    (c) => normalizeText(c.name) === normalized,
  ) ?? null
}

export function buildCategoryTree(categories) {
  const list = Array.isArray(categories) ? categories : []
  const sorted = [...list].sort(compareByCode)
  const roots = []
  const map = new Map()

  for (const cat of sorted) {
    const node = { ...cat, children: [] }
    map.set(cat.code, node)
  }

  for (const cat of sorted) {
    const node = map.get(cat.code)
    if (cat.parent_code && map.has(cat.parent_code)) {
      map.get(cat.parent_code).children.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}
