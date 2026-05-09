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
  return value.toLocaleString('nb-NO') + ' km' // non-breaking space before km
}
