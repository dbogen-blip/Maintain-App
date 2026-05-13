// PostalCodeInput — a 4-digit postal code field with automatic city lookup.
// Shows the city and municipality name below the input as the user types.
// Lookup is debounced 300 ms to avoid firing on every keystroke.
// Pass `value` + `onChange(code, city)` — parent owns the value.
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'
import './PostalCodeInput.css'

export default function PostalCodeInput({
  label = 'Postnummer',
  value = '',
  onChange,
  hint,
  placeholder = '0000',
  disabled = false,
}) {
  const [lookup, setLookup] = useState(null)   // { city, municipality } | null | 'not_found'
  const timerRef = useRef(null)

  useEffect(() => {
    const code = (value || '').trim()
    if (code.length !== 4 || !/^\d{4}$/.test(code)) {
      setLookup(null)
      return
    }
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('postal_codes')
        .select('city, municipality')
        .eq('code', code)
        .maybeSingle()
      setLookup(data ?? 'not_found')
    }, 300)
    return () => clearTimeout(timerRef.current)
  }, [value])

  function handleChange(e) {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4)
    const city = lookup && lookup !== 'not_found' ? lookup.city : null
    onChange?.(raw, city)
  }

  const locationLine =
    lookup === 'not_found'
      ? 'Ukjent postnummer'
      : lookup
      ? `${lookup.city}${lookup.municipality !== lookup.city ? ', ' + lookup.municipality : ''}`
      : null

  return (
    <div className="field postal-code-field">
      {label && <label>{label}</label>}
      <div className="postal-code-wrap">
        <input
          type="text"
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          className="postal-code-input"
          aria-label={label}
        />
        {locationLine && (
          <span className={`postal-code-place${lookup === 'not_found' ? ' postal-code-place--error' : ''}`}>
            {locationLine}
          </span>
        )}
      </div>
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  )
}
