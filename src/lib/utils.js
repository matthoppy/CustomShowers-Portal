export function formatCurrency(amount) {
  if (amount === null || amount === undefined) return '—'
  return `£${Number(amount).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatDatetime(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function generateRef(prefix, count) {
  return `${prefix}-${String(count + 1).padStart(3, '0')}`
}

export function calcTotals(items, vatRate = 20) {
  const subtotal = items.reduce((sum, item) => sum + (Number(item.total) || 0), 0)
  const vat_amount = (subtotal * vatRate) / 100
  const total = subtotal + vat_amount
  return { subtotal, vat_amount, total }
}
