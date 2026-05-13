// Shared number-formatting utilities.
// Centralising here ensures consistent locale output across all components.
// nb-NO locale: thousands separator = thin space, decimal = comma.

// Format a NOK amount with Norwegian thousands separator and no decimals.
// Returns null (not "kr 0") when value is null/undefined so callers can
// conditionally render without extra null-checks.
export function formatNok(value) {
  if (value == null) return null
  return new Intl.NumberFormat('nb-NO', {
    style:                'currency',
    currency:             'NOK',
    maximumFractionDigits: 0,
  }).format(value)
}

// Format an odometer reading with Norwegian thousands separator.
// Returns null when value is null/undefined.
export function formatKm(value) {
  if (value == null) return null
  return value.toLocaleString('nb-NO') + ' km'
}

// Format an ISO date string (YYYY-MM-DD) or Date object as "12. mai 2029".
// Returns null when value is null/undefined/empty.
export function formatDate(value) {
  if (!value) return null
  const str = typeof value === 'string' ? value.slice(0, 10) : value.toISOString().slice(0, 10)
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('nb-NO', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}
