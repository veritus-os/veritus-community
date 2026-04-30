const columns = [
  'Family Name',
  'Responsible Name',
  'Responsible CPF',
  'Responsible Phone',
  'Responsible Email',
  'Student Name',
  'Birth Date',
  'Segment',
  'Class',
  'Shift',
  'Modality',
  'Allergies',
  'Dietary Restrictions',
  'Notes',
]

function toCsvValue(value) {
  if (value === null || value === undefined) return ''
  const str = String(value).replaceAll('"', '""')
  if (/[";\n]/.test(str)) return `"${str}"`
  return str
}

export class SpreadsheetExportService {
  constructor(schoolCrudService) {
    this.schoolCrudService = schoolCrudService
  }

  async buildRows() {
    const families = await this.schoolCrudService.listFamiliesDetailed()
    const rows = []

    for (const family of families) {
      const responsible = family.responsible
      const students = family.students.length ? family.students : [null]

      for (const student of students) {
        rows.push({
          familyName: family.family_name,
          responsibleName: responsible?.full_name ?? '',
          responsibleCpf: responsible?.cpf ?? '',
          responsiblePhone: responsible?.phone ?? '',
          responsibleEmail: responsible?.email ?? '',
          studentName: student?.full_name ?? '',
          birthDate: student?.birth_date ?? '',
          segment: student?.segment ?? '',
          className: student?.class_name ?? '',
          shift: student?.shift ?? '',
          modality: student?.modality ?? '',
          allergies: student?.allergies ?? '',
          dietaryRestrictions: student?.dietary_restrictions ?? '',
          notes: [family.notes, responsible?.notes, student?.notes].filter(Boolean).join(' | '),
        })
      }
    }

    return rows
  }

  async exportCsv(filename = 'backup_familias_alunos.csv') {
    const rows = await this.buildRows()
    const lines = [
      columns.join(';'),
      ...rows.map((row) =>
        [
          row.familyName,
          row.responsibleName,
          row.responsibleCpf,
          row.responsiblePhone,
          row.responsibleEmail,
          row.studentName,
          row.birthDate,
          row.segment,
          row.className,
          row.shift,
          row.modality,
          row.allergies,
          row.dietaryRestrictions,
          row.notes,
        ]
          .map(toCsvValue)
          .join(';'),
      ),
    ]

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.setAttribute('download', filename)
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)

    return { columns, rows }
  }

  async exportStructuredJson() {
    const rows = await this.buildRows()
    return { columns, rows }
  }
}
