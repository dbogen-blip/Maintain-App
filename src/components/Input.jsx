import './Input.css'

export function Input({ label, hint, error, id, ...rest }) {
  const inputId = id || `i-${rest.name || rest.placeholder}`
  const charCount = rest.maxLength && rest.value != null ? String(rest.value).length : null
  return (
    <div className="field">
      {label && (
        <div className="field-label-row">
          <label htmlFor={inputId}>{label}</label>
          {charCount !== null && (
            <span className={`field-char-count${charCount >= rest.maxLength ? ' field-char-count-limit' : ''}`}>
              {charCount}/{rest.maxLength}
            </span>
          )}
        </div>
      )}
      <input id={inputId} className={`input${error ? ' input-error' : ''}`} {...rest} />
      {error ? <span className="field-error">{error}</span> : hint && <span className="field-hint">{hint}</span>}
    </div>
  )
}

export function Textarea({ label, hint, error, id, rows = 3, ...rest }) {
  const inputId = id || `t-${rest.name || rest.placeholder}`
  const charCount = rest.maxLength && rest.value != null ? String(rest.value).length : null
  return (
    <div className="field">
      {label && (
        <div className="field-label-row">
          <label htmlFor={inputId}>{label}</label>
          {charCount !== null && (
            <span className={`field-char-count${charCount >= rest.maxLength ? ' field-char-count-limit' : ''}`}>
              {charCount}/{rest.maxLength}
            </span>
          )}
        </div>
      )}
      <textarea id={inputId} rows={rows} className={`input${error ? ' input-error' : ''}`} {...rest} />
      {error ? <span className="field-error">{error}</span> : hint && <span className="field-hint">{hint}</span>}
    </div>
  )
}

export function Select({ label, hint, error, id, options = [], children, ...rest }) {
  const inputId = id || `s-${rest.name || ''}`
  return (
    <div className="field">
      {label && <label htmlFor={inputId}>{label}</label>}
      <select id={inputId} className={`input select${error ? ' input-error' : ''}`} {...rest}>
        {children
          ? children
          : options.map(opt =>
              typeof opt === 'string'
                ? <option key={opt} value={opt}>{opt}</option>
                : <option key={opt.value} value={opt.value}>{opt.label}</option>
            )}
      </select>
      {error ? <span className="field-error">{error}</span> : hint && <span className="field-hint">{hint}</span>}
    </div>
  )
}

export function Checkbox({ label, ...rest }) {
  return (
    <label className="checkbox">
      <input type="checkbox" {...rest} />
      <span>{label}</span>
    </label>
  )
}
