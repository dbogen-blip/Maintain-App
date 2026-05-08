import { useRef, useState } from 'react'
import Icon from './Icon'
import { humanSize, isImage, publicUrl } from '../storage'
import './FileUpload.css'

/**
 * Generisk upload-komponent.
 * Props:
 *   - onSelect(file): kalles når bruker velger fil. Du gjør upload selv.
 *   - accept: MIME-mønster (default: alle)
 *   - multiple: tillat flere filer
 *   - existing: array av { id, file_path, file_name, mime_type, size_bytes } for eksisterende vedlegg
 *   - onDelete(id): kalles når et eksisterende vedlegg fjernes
 *   - hint: kort hjelpetekst
 */
export default function FileUpload({
  onSelect,
  accept = 'image/*,application/pdf',
  multiple = false,
  existing = [],
  onDelete,
  hint,
}) {
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)

  async function handleChange(e) {
    const files = [...e.target.files]
    if (files.length === 0) return
    setBusy(true)
    try {
      for (const f of files) {
        await onSelect(f)
      }
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="upload">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        className="upload-input"
        disabled={busy}
      />
      <button
        type="button"
        className="upload-btn"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
      >
        <Icon name="upload" size={18} />
        <span>{busy ? 'Laster opp...' : 'Velg fil'}</span>
      </button>
      {hint && <p className="upload-hint">{hint}</p>}

      {existing.length > 0 && (
        <ul className="upload-list">
          {existing.map(att => (
            <li key={att.id || att.file_path} className="upload-item">
              {isImage(att.mime_type) ? (
                <img
                  src={publicUrl(att.file_path)}
                  alt={att.file_name}
                  className="upload-thumb"
                />
              ) : (
                <div className="upload-thumb upload-thumb-doc">
                  <Icon name="image" size={20} />
                </div>
              )}
              <div className="upload-meta">
                <a href={publicUrl(att.file_path)} target="_blank" rel="noreferrer">
                  {att.file_name}
                </a>
                <span className="upload-size">{humanSize(att.size_bytes)}</span>
              </div>
              {onDelete && (
                <button
                  type="button"
                  className="upload-delete"
                  onClick={() => onDelete(att)}
                  aria-label="Fjern vedlegg"
                >
                  <Icon name="trash" size={16} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
