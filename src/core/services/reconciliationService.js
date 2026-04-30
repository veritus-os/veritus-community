function normalizeDateOnly(value) {
  if (!value) return ''
  return String(value).slice(0, 10)
}

function daysBetween(dateA, dateB) {
  const a = new Date(dateA)
  const b = new Date(dateB)
  return Math.abs(Math.round((a - b) / (1000 * 60 * 60 * 24)))
}

export class ReconciliationService {
  constructor({ bankStatementRepository, financialRecordRepository, financialService }) {
    this.bankStatementRepository = bankStatementRepository
    this.financialRecordRepository = financialRecordRepository
    this.financialService = financialService
  }

  async importBankStatement(entries, { changedBy = 'Sistema' } = {}) {
    const created = []
    for (const entry of entries) {
      const record = await this.bankStatementRepository.create({
        date: normalizeDateOnly(entry.date),
        description: String(entry.description || '').trim(),
        amount: Number(entry.amount) || 0,
        ref: String(entry.ref || '').trim(),
        matched_record_id: null,
        status: 'unmatched',
      })
      created.push(record)
    }
    return created
  }

  async autoMatch() {
    const [statements, records] = await Promise.all([
      this.bankStatementRepository.list(),
      this.financialRecordRepository.list(),
    ])

    const unmatched = statements.filter((s) => s.status === 'unmatched')
    const paidRecords = records.filter(
      (r) => r.payment_status === 'paid' && !r.conciliated_at,
    )

    const matched = []
    const usedRecordIds = new Set()

    for (const entry of unmatched) {
      const entryAmount = Math.abs(Number(entry.amount) || 0)
      const candidate = paidRecords.find((r) => {
        if (usedRecordIds.has(r.id)) return false
        const recordAmount = Math.abs(Number(r.amount) || 0)
        if (Math.abs(entryAmount - recordAmount) > 0.01) return false
        const paymentDate = r.payment_date || r.due_date
        if (!paymentDate || !entry.date) return true
        return daysBetween(entry.date, paymentDate) <= 3
      })

      if (candidate) {
        usedRecordIds.add(candidate.id)
        matched.push({ statementEntry: entry, record: candidate })
      }
    }

    return {
      matched,
      unmatched: unmatched.filter(
        (s) => !matched.some((m) => m.statementEntry.id === s.id),
      ),
    }
  }

  async confirmMatch(statementId, recordId, { changedBy = 'Sistema' } = {}) {
    await this.bankStatementRepository.update(statementId, {
      matched_record_id: Number(recordId),
      status: 'matched',
    })

    await this.financialService.conciliateRecord(recordId, {
      changedBy,
      bankStatementRef: `STMT-${statementId}`,
    })

    return true
  }

  async confirmAllMatches(matches, { changedBy = 'Sistema' } = {}) {
    let confirmed = 0
    for (const match of matches) {
      await this.confirmMatch(match.statementEntry.id, match.record.id, { changedBy })
      confirmed += 1
    }
    return confirmed
  }

  async listStatements() {
    return this.bankStatementRepository.list()
  }

  async listUnreconciledRecords() {
    const records = await this.financialRecordRepository.list()
    return records.filter((r) => r.payment_status === 'paid' && !r.conciliated_at)
  }
}
