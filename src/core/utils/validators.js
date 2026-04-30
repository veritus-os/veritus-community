export function normalizeCpf(value = '') {
  return String(value).replace(/\D/g, '')
}

export function isValidCpf(value = '') {
  const cpf = normalizeCpf(value)
  if (!cpf) return true
  if (cpf.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cpf)) return false

  const calcDigit = (slice, factor) => {
    let total = 0
    for (const num of slice) {
      total += Number(num) * factor
      factor -= 1
    }
    const rest = (total * 10) % 11
    return rest === 10 ? 0 : rest
  }

  const digit1 = calcDigit(cpf.slice(0, 9), 10)
  const digit2 = calcDigit(cpf.slice(0, 10), 11)
  return digit1 === Number(cpf[9]) && digit2 === Number(cpf[10])
}
