function normalizeDateOnly(value) {
  if (!value) return ''
  return String(value).slice(0, 10)
}

function requireField(value, label) {
  if (!String(value ?? '').trim()) {
    throw new Error(`Campo obrigatório: ${label}.`)
  }
}

export class ContractService {
  constructor({ contractRepository, financialRecordRepository, auditLogRepository }) {
    this.contractRepository = contractRepository
    this.financialRecordRepository = financialRecordRepository
    this.auditLogRepository = auditLogRepository
  }

  async createContract(payload) {
    requireField(payload.family_id, 'Família')
    requireField(payload.student_id, 'Aluno')
    requireField(payload.service_type, 'Tipo de serviço')
    requireField(payload.amount_per_installment, 'Valor por parcela')
    requireField(payload.installment_count, 'Número de parcelas')
    requireField(payload.due_day, 'Dia de vencimento')
    requireField(payload.start_month, 'Mês inicial')

    const amount = Number(payload.amount_per_installment)
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('Valor por parcela inválido.')

    const count = Math.floor(Number(payload.installment_count))
    if (count < 1 || count > 48) throw new Error('Número de parcelas deve ser entre 1 e 48.')

    const dueDay = Math.floor(Number(payload.due_day))
    if (dueDay < 1 || dueDay > 28) throw new Error('Dia de vencimento deve ser entre 1 e 28.')

    const startMonth = String(payload.start_month).slice(0, 7)
    const endDate = new Date(`${startMonth}-01T00:00:00`)
    endDate.setMonth(endDate.getMonth() + count - 1)
    const endMonth = endDate.toISOString().slice(0, 7)

    const contract = await this.contractRepository.create({
      family_id: Number(payload.family_id),
      student_id: Number(payload.student_id),
      service_type: payload.service_type,
      description: payload.description || payload.service_type,
      amount_per_installment: amount,
      installment_count: count,
      due_day: dueDay,
      start_month: startMonth,
      end_month: endMonth,
      category_code: payload.category_code || null,
      active_status: true,
      notes: payload.notes || '',
    })

    await this._generateInstallments(contract)

    if (this.auditLogRepository) {
      await this.auditLogRepository.create({
        module: 'financeiro',
        entity_type: 'contract',
        entity_id: contract.id,
        action: 'criacao_contrato',
        changed_by: payload.changedBy || 'Sistema',
        details: `Contrato criado: ${contract.description} (${count}x R$${amount.toFixed(2)}).`,
      })
    }

    return contract
  }

  async updateContract(id, payload) {
    const current = await this.contractRepository.getById(id)
    if (!current) throw new Error('Contrato não encontrado.')

    const amount = Number(payload.amount_per_installment ?? current.amount_per_installment)
    const count = Math.floor(Number(payload.installment_count ?? current.installment_count))
    const dueDay = Math.floor(Number(payload.due_day ?? current.due_day))
    const startMonth = String(payload.start_month ?? current.start_month).slice(0, 7)

    const endDate = new Date(`${startMonth}-01T00:00:00`)
    endDate.setMonth(endDate.getMonth() + count - 1)
    const endMonth = endDate.toISOString().slice(0, 7)

    const updated = await this.contractRepository.update(id, {
      ...payload,
      amount_per_installment: amount,
      installment_count: count,
      due_day: dueDay,
      start_month: startMonth,
      end_month: endMonth,
    })

    await this._regenerateInstallments(updated)

    return updated
  }

  async _generateInstallments(contract) {
    const count = contract.installment_count
    const amount = contract.amount_per_installment
    const dueDay = String(contract.due_day).padStart(2, '0')

    for (let i = 0; i < count; i += 1) {
      const monthDate = new Date(`${contract.start_month}-01T00:00:00`)
      monthDate.setMonth(monthDate.getMonth() + i)
      const monthKey = monthDate.toISOString().slice(0, 7)
      const dueDate = `${monthKey}-${dueDay}`

      await this.financialRecordRepository.create({
        family_id: contract.family_id,
        student_id: contract.student_id,
        responsible_id: null,
        item_type: contract.service_type,
        item_subtype: contract.description !== contract.service_type ? contract.description : '',
        amount,
        due_date: dueDate,
        payment_method: 'boleto',
        payment_status: 'pending',
        reference_month: monthKey,
        payment_date: null,
        installment_number: i + 1,
        installment_total: count,
        scholarship_type: '',
        scholarship_tag: '',
        cash_flow_type: 'entrada',
        category_code: contract.category_code,
        contract_id: contract.id,
        notes: '',
        updated_by: 'Sistema',
      })
    }
  }

  async _regenerateInstallments(contract) {
    const records = await this.financialRecordRepository.list()
    const linked = records.filter((r) => r.contract_id === contract.id)

    const settled = ['paid', 'conciliated']
    for (const record of linked) {
      if (settled.includes(record.payment_status)) continue
      // Remove pending/overdue records — they'll be regenerated
      const data = this.financialRecordRepository.db.read()
      data.financial_records = data.financial_records.filter((r) => r.id !== record.id)
      this.financialRecordRepository.db.write(data)
    }

    const settledCount = linked.filter((r) => settled.includes(r.payment_status)).length
    const count = contract.installment_count
    const amount = contract.amount_per_installment
    const dueDay = String(contract.due_day).padStart(2, '0')

    const settledMonths = new Set(
      linked.filter((r) => settled.includes(r.payment_status)).map((r) => r.reference_month),
    )

    let installmentNum = settledCount + 1
    for (let i = 0; i < count; i += 1) {
      const monthDate = new Date(`${contract.start_month}-01T00:00:00`)
      monthDate.setMonth(monthDate.getMonth() + i)
      const monthKey = monthDate.toISOString().slice(0, 7)

      if (settledMonths.has(monthKey)) continue

      const dueDate = `${monthKey}-${dueDay}`
      await this.financialRecordRepository.create({
        family_id: contract.family_id,
        student_id: contract.student_id,
        responsible_id: null,
        item_type: contract.service_type,
        item_subtype: contract.description !== contract.service_type ? contract.description : '',
        amount,
        due_date: dueDate,
        payment_method: 'boleto',
        payment_status: 'pending',
        reference_month: monthKey,
        payment_date: null,
        installment_number: installmentNum,
        installment_total: count,
        scholarship_type: '',
        scholarship_tag: '',
        cash_flow_type: 'entrada',
        category_code: contract.category_code,
        contract_id: contract.id,
        notes: '',
        updated_by: 'Sistema',
      })
      installmentNum += 1
    }
  }

  async deleteContract(id) {
    const records = await this.financialRecordRepository.list()
    const linked = records.filter((r) => r.contract_id === Number(id))
    const settled = ['paid', 'conciliated']
    const hasSettled = linked.some((r) => settled.includes(r.payment_status))

    if (hasSettled) {
      throw new Error('Não é possível excluir contrato com parcelas já pagas. Cancele as parcelas primeiro.')
    }

    // Remove all linked pending records
    const data = this.financialRecordRepository.db.read()
    const linkedIds = new Set(linked.map((r) => r.id))
    data.financial_records = data.financial_records.filter((r) => !linkedIds.has(r.id))
    this.financialRecordRepository.db.write(data)

    return this.contractRepository.delete(id)
  }

  async listContracts() {
    return this.contractRepository.list()
  }

  async getContractDetail(id) {
    const contract = await this.contractRepository.getById(id)
    if (!contract) return null
    const records = await this.financialRecordRepository.list()
    const linked = records.filter((r) => r.contract_id === contract.id)
    return { ...contract, records: linked }
  }
}
