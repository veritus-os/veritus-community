export class RecurringTransactionService {
  constructor({ recurringTemplateRepository, financialRecordRepository }) {
    this.recurringTemplateRepository = recurringTemplateRepository
    this.financialRecordRepository = financialRecordRepository
  }

  async createTemplate(payload) {
    if (!payload.description?.trim()) throw new Error('Descrição obrigatória.')
    if (!Number.isFinite(Number(payload.amount)) || Number(payload.amount) <= 0) throw new Error('Valor inválido.')

    return this.recurringTemplateRepository.create({
      description: payload.description.trim(),
      amount: Number(payload.amount),
      category_code: payload.category_code || null,
      cash_flow_type: payload.cash_flow_type || 'saída',
      due_day: Math.max(1, Math.min(28, Math.floor(Number(payload.due_day) || 10))),
      frequency: 'monthly',
      active_status: true,
      last_generated_month: null,
      notes: payload.notes || '',
    })
  }

  async updateTemplate(id, payload) {
    return this.recurringTemplateRepository.update(id, payload)
  }

  async toggleTemplate(id) {
    const template = await this.recurringTemplateRepository.getById(id)
    if (!template) throw new Error('Template não encontrado.')
    return this.recurringTemplateRepository.update(id, {
      active_status: !template.active_status,
    })
  }

  async deleteTemplate(id) {
    return this.recurringTemplateRepository.delete(id)
  }

  async listTemplates() {
    return this.recurringTemplateRepository.list()
  }

  async generatePendingRecords(referenceMonth) {
    const monthKey = String(referenceMonth || '').slice(0, 7)
    if (!monthKey || monthKey.length !== 7) throw new Error('Mês de referência inválido.')

    const templates = await this.recurringTemplateRepository.list()
    const active = templates.filter((t) => t.active_status)
    let generated = 0

    for (const template of active) {
      if (template.last_generated_month && template.last_generated_month >= monthKey) continue

      const dueDay = String(template.due_day || 10).padStart(2, '0')
      const dueDate = `${monthKey}-${dueDay}`

      await this.financialRecordRepository.create({
        family_id: null,
        student_id: null,
        responsible_id: null,
        item_type: template.description,
        item_subtype: '',
        amount: template.amount,
        due_date: dueDate,
        payment_method: 'boleto',
        payment_status: 'pending',
        reference_month: monthKey,
        payment_date: null,
        installment_number: 1,
        installment_total: 1,
        scholarship_type: '',
        scholarship_tag: '',
        cash_flow_type: template.cash_flow_type || 'saída',
        category_code: template.category_code,
        contract_id: null,
        notes: `Gerado automaticamente do template "${template.description}"`,
        updated_by: 'Sistema',
      })

      await this.recurringTemplateRepository.update(template.id, {
        last_generated_month: monthKey,
      })

      generated += 1
    }

    return generated
  }
}
