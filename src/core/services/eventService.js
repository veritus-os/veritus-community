export class EventService {
  constructor({ schoolCrudService }) {
    this.schoolCrudService = schoolCrudService
  }

  async listEventsDetailed() {
    const [events, orders] = await Promise.all([
      this.schoolCrudService.listEvents(),
      this.schoolCrudService.listEventOrders(),
    ])

    return events
      .map((event) => {
        const eventOrders = orders.filter((order) => (order.service_id ?? order.event_id) === event.id)
        const totalAmount = eventOrders.reduce((sum, item) => sum + Number(item.amount || 0), 0)
        return {
          ...event,
          orders_count: eventOrders.length,
          total_amount: totalAmount,
        }
      })
      .sort((a, b) => String(a.event_date).localeCompare(String(b.event_date)))
  }

  async listEventsByView(view) {
    const rows = await this.listEventsDetailed()
    if (view === 'arquivados') return rows.filter((item) => item.is_archived)
    if (view === 'gestao_servicos') return rows.filter((item) => !item.is_archived)
    return rows.filter((item) => !item.is_archived)
  }

  async listEventOrdersDetailed() {
    const [orders, events, families, students] = await Promise.all([
      this.schoolCrudService.listEventOrders(),
      this.schoolCrudService.listEvents(),
      this.schoolCrudService.listFamilies(),
      this.schoolCrudService.listStudents(),
    ])

    return orders
      .map((order) => ({
        ...order,
        service_id: order.service_id ?? order.event_id ?? null,
        order_date: order.order_date ?? String(order.created_at || '').slice(0, 10),
        event: events.find((event) => event.id === (order.service_id ?? order.event_id)) ?? null,
        family: families.find((family) => family.id === order.family_id) ?? null,
        student: students.find((student) => student.id === order.student_id) ?? null,
      }))
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
  }

  async listEventOrdersFiltered(filters = {}) {
    const rows = await this.listEventOrdersDetailed()
    return rows.filter((row) => {
      const matchesDate =
        !filters.order_date || String(row.order_date || '').slice(0, 10) === String(filters.order_date).slice(0, 10)
      const matchesStatus =
        !filters.payment_status ||
        filters.payment_status === 'todos' ||
        row.payment_status === filters.payment_status
      const matchesFamily =
        !filters.family_id ||
        filters.family_id === 'todos' ||
        Number(filters.family_id) === Number(row.family_id)
      const matchesStudent =
        !filters.student_id ||
        filters.student_id === 'todos' ||
        Number(filters.student_id) === Number(row.student_id)
      const matchesService =
        !filters.service_id ||
        filters.service_id === 'todos' ||
        Number(filters.service_id) === Number(row.service_id)
      return matchesDate && matchesStatus && matchesFamily && matchesStudent && matchesService
    })
  }

  async getServicesManagement(filters = {}) {
    const orders = await this.listEventOrdersFiltered(filters)
    const totalContratados = orders.length
    const totalPrevisto = orders.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    const totalPago = orders
      .filter((item) => item.payment_status === 'paid')
      .reduce((sum, item) => sum + Number(item.amount || 0), 0)
    const totalPendente = orders
      .filter((item) => item.payment_status !== 'paid')
      .reduce((sum, item) => sum + Number(item.amount || 0), 0)
    return {
      rows: orders,
      cards: {
        totalContratados,
        totalPrevisto,
        totalPago,
        totalPendente,
      },
    }
  }
}
