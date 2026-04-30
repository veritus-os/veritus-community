export const SERVICE_DEFAULTS = {
  support_link: 'https://wa.me/5511999999999',
  group_link: 'https://chat.whatsapp.com/exemplo-cav-os',
}

export const EVENT_KINDS = ['evento', 'servico']

export function kindLabel(kind) {
  if (kind === 'servico') return 'Serviço'
  return 'Evento'
}

export function paymentStatusLabel(status) {
  if (status === 'paid') return 'Pago'
  if (status === 'overdue') return 'Em atraso'
  return 'Pendente'
}

export function paymentStatusClass(status) {
  if (status === 'paid') return 'bg-emerald-50 text-emerald-700'
  if (status === 'overdue') return 'bg-rose-50 text-rose-700'
  return 'bg-amber-50 text-amber-700'
}
