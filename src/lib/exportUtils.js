function escapeCsv(value) {
  if (value === null || value === undefined) return ''
  const normalized = String(value).replaceAll('"', '""')
  if (/[",;\n]/.test(normalized)) return `"${normalized}"`
  return normalized
}

export function downloadCsv({ filename, columns, rows, delimiter = ';' }) {
  const header = columns.map((col) => escapeCsv(col.label)).join(delimiter)
  const body = rows
    .map((row) => columns.map((col) => escapeCsv(typeof col.getValue === 'function' ? col.getValue(row) : row[col.key])).join(delimiter))
    .join('\n')

  const csv = `${header}\n${body}`
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function downloadExcelLike({ filename, columns, rows }) {
  const header = columns.map((col) => col.label).join('\t')
  const body = rows
    .map((row) => columns.map((col) => String(typeof col.getValue === 'function' ? col.getValue(row) : row[col.key] ?? '')).join('\t'))
    .join('\n')

  const content = `${header}\n${body}`
  const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
