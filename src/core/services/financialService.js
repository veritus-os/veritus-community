const VALID_STATUSES = ['pending', 'paid', 'overdue', 'cancelled', 'conciliated', 'renegotiated']

const ALLOWED_TRANSITIONS = {
  pending: ['paid', 'overdue', 'cancelled', 'renegotiated'],
  overdue: ['paid', 'cancelled', 'renegotiated'],
  paid: ['conciliated'],
  cancelled: [],
  conciliated: [],
  renegotiated: [],
}

function normalizeDateOnly(value) {
  if (!value) return ''
  return String(value).slice(0, 10)
}

function nowIso() {
  return new Date().toISOString()
}

export class FinancialService {
  constructor({ financialRecordRepository, auditLogRepository }) {
    this.financialRecordRepository = financialRecordRepository
    this.auditLogRepository = auditLogRepository
    this._periodLockDate = null
  }

  setDatabaseRef(database) {
    this.database = database
  }

  _getSettings() {
    if (!this.database) return {}
    const data = this.database.read()
    return data.settings || {}
  }

  _getPeriodLockDate() {
    const settings = this._getSettings()
    return settings.period_lock_date || null
  }

  _checkPeriodLock(recordDueDate) {
    const lockDate = this._getPeriodLockDate()
    if (!lockDate || !recordDueDate) return null
    if (normalizeDateOnly(recordDueDate) <= normalizeDateOnly(lockDate)) {
      return `Período bloqueado até ${lockDate}. Este lançamento não pode ser alterado.`
    }
    return null
  }

  async _createAuditLog({ entityId, action, changedBy, details, beforeSnapshot, afterSnapshot }) {
    if (!this.auditLogRepository) return null
    return this.auditLogRepository.create({
      module: 'financeiro',
      entity_type: 'financial_record',
      entity_id: entityId,
      action,
      changed_by: changedBy || 'Sistema',
      details: details || '',
      before_snapshot: beforeSnapshot ? JSON.stringify(beforeSnapshot) : null,
      after_snapshot: afterSnapshot ? JSON.stringify(afterSnapshot) : null,
    })
  }

  async updateRecordStatus(recordId, newStatus, { changedBy = 'Sistema', reason, adminPassword } = {}) {
    if (!VALID_STATUSES.includes(newStatus)) {
      throw new Error(`Status inválido: "${newStatus}".`)
    }

    const current = await this.financialRecordRepository.getById(recordId)
    if (!current) throw new Error('Lançamento financeiro não encontrado.')

    const currentStatus = current.payment_status || 'pending'
    const allowed = ALLOWED_TRANSITIONS[currentStatus] || []
    if (!allowed.includes(newStatus)) {
      throw new Error(`Transição não permitida: "${currentStatus}" → "${newStatus}".`)
    }

    const lockError = this._checkPeriodLock(current.due_date)
    if (lockError && !adminPassword) throw new Error(lockError)

    const beforeSnapshot = { ...current }
    const updates = { payment_status: newStatus, updated_by: changedBy }

    if (newStatus === 'paid') {
      updates.payment_date = normalizeDateOnly(nowIso())
    }
    if (newStatus === 'cancelled') {
      updates.cancelled_at = nowIso()
      updates.cancelled_reason = reason || ''
    }
    if (newStatus === 'conciliated') {
      updates.conciliated_at = nowIso()
    }

    const updated = await this.financialRecordRepository.update(recordId, updates)

    await this._createAuditLog({
      entityId: Number(recordId),
      action: `status_${newStatus}`,
      changedBy,
      details: `Status alterado de "${currentStatus}" para "${newStatus}".${reason ? ` Motivo: ${reason}` : ''}`,
      beforeSnapshot,
      afterSnapshot: updated,
    })

    return updated
  }

  async markAsPaid(recordId, { changedBy = 'Secretaria', paymentMethod, adminPassword } = {}) {
    const current = await this.financialRecordRepository.getById(recordId)
    if (!current) throw new Error('Lançamento financeiro não encontrado.')

    const lockError = this._checkPeriodLock(current.due_date)
    if (lockError && !adminPassword) throw new Error(lockError)

    const beforeSnapshot = { ...current }
    const safePaymentMethod = paymentMethod || current.payment_method || 'boleto'

    const updated = await this.financialRecordRepository.update(recordId, {
      payment_status: 'paid',
      payment_date: normalizeDateOnly(nowIso()),
      payment_method: safePaymentMethod,
      paid_in_cash: safePaymentMethod === 'cash',
      updated_by: changedBy,
    })

    await this._createAuditLog({
      entityId: Number(recordId),
      action: 'marcar_como_pago',
      changedBy,
      details: `Lançamento #${recordId} marcado como pago via ${safePaymentMethod}.`,
      beforeSnapshot,
      afterSnapshot: updated,
    })

    return updated
  }

  async cancelRecord(recordId, { changedBy = 'Sistema', reason = '' } = {}) {
    return this.updateRecordStatus(recordId, 'cancelled', { changedBy, reason })
  }

  async conciliateRecord(recordId, { changedBy = 'Sistema', bankStatementRef, adminPassword } = {}) {
    const current = await this.financialRecordRepository.getById(recordId)
    if (!current) throw new Error('Lançamento financeiro não encontrado.')
    if (current.payment_status !== 'paid') {
      throw new Error('Apenas lançamentos pagos podem ser conciliados.')
    }

    const lockError = this._checkPeriodLock(current.due_date)
    if (lockError && !adminPassword) throw new Error(lockError)

    const beforeSnapshot = { ...current }
    const updated = await this.financialRecordRepository.update(recordId, {
      payment_status: 'conciliated',
      conciliated_at: nowIso(),
      bank_statement_ref: bankStatementRef || null,
      updated_by: changedBy,
    })

    await this._createAuditLog({
      entityId: Number(recordId),
      action: 'conciliacao',
      changedBy,
      details: `Lançamento #${recordId} conciliado.${bankStatementRef ? ` Ref: ${bankStatementRef}` : ''}`,
      beforeSnapshot,
      afterSnapshot: updated,
    })

    return updated
  }

  async renegotiateRecord(recordId, { changedBy = 'Sistema', newDueDate, newAmount, splitCount = 1, adminPassword } = {}) {
    const current = await this.financialRecordRepository.getById(recordId)
    if (!current) throw new Error('Lançamento financeiro não encontrado.')

    const lockError = this._checkPeriodLock(current.due_date)
    if (lockError && !adminPassword) throw new Error(lockError)

    const currentStatus = current.payment_status || 'pending'
    if (!['pending', 'overdue'].includes(currentStatus)) {
      throw new Error('Apenas lançamentos pendentes ou inadimplentes podem ser renegociados.')
    }

    const beforeSnapshot = { ...current }
    const amount = Number(newAmount) || Number(current.amount) || 0
    const splits = Math.max(1, Math.floor(Number(splitCount)))
    const splitAmount = Math.round((amount / splits) * 100) / 100

    await this.financialRecordRepository.update(recordId, {
      payment_status: 'renegotiated',
      updated_by: changedBy,
    })

    const baseDueDate = newDueDate || current.due_date
    const created = []
    for (let i = 0; i < splits; i += 1) {
      const dueDate = new Date(`${baseDueDate}T00:00:00`)
      dueDate.setMonth(dueDate.getMonth() + i)
      const dueDateIso = normalizeDateOnly(dueDate.toISOString())

      const record = await this.financialRecordRepository.create({
        family_id: current.family_id,
        student_id: current.student_id,
        responsible_id: current.responsible_id,
        item_type: current.item_type,
        item_subtype: current.item_subtype,
        amount: i === splits - 1 ? Math.round((amount - splitAmount * (splits - 1)) * 100) / 100 : splitAmount,
        due_date: dueDateIso,
        payment_method: current.payment_method,
        payment_status: 'pending',
        reference_month: dueDateIso.slice(0, 7),
        payment_date: null,
        installment_number: i + 1,
        installment_total: splits,
        scholarship_type: current.scholarship_type || '',
        scholarship_tag: current.scholarship_tag || '',
        cash_flow_type: current.cash_flow_type || 'entrada',
        category_code: current.category_code,
        renegotiated_from_id: current.id,
        notes: `Renegociação do lançamento #${current.id}`,
        updated_by: changedBy,
      })
      created.push(record)
    }

    await this._createAuditLog({
      entityId: Number(recordId),
      action: 'renegociacao',
      changedBy,
      details: `Lançamento #${recordId} renegociado em ${splits} nova(s) parcela(s).`,
      beforeSnapshot,
      afterSnapshot: { renegotiated: true, newRecordIds: created.map((r) => r.id) },
    })

    return { original: current, newRecords: created }
  }

  async markOverdueRecords() {
    const records = await this.financialRecordRepository.list()
    const today = normalizeDateOnly(nowIso())
    let count = 0

    for (const record of records) {
      if (record.payment_status !== 'pending') continue
      if (!record.due_date || normalizeDateOnly(record.due_date) >= today) continue

      await this.financialRecordRepository.update(record.id, {
        payment_status: 'overdue',
      })
      count += 1
    }

    return count
  }

  async setPeriodLock(lockDate) {
    if (!this.database) throw new Error('Database não configurada.')
    const data = this.database.read()
    if (!data.settings) data.settings = {}
    data.settings.period_lock_date = lockDate || null
    this.database.write(data)
    return data.settings
  }

  getPeriodLockDate() {
    return this._getPeriodLockDate()
  }
}
