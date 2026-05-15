import { useRef, useState } from 'react'
import Icon from './Icon'
import { humanSize, isImage, publicUrl, compressImage } from '../storage'
import './FileUpload.css'

/**
 * Generisk upload-komponent.
 * Props:
 *   - onSelect(file): kalles per fil. Du gjør selve upload-kallet.
 *   - accept: MIME-mønster
 *   - multiple: tillat flere filer
 *   - maxFiles: maks antall vedlegg totalt (existing + nye). Default 5.
 *   - existing: array av { id, file_path, file_name, mime_type, size_bytes }
 *   - onDelete(attachment): fjern eksisterende vedlegg
 *   - hint: kort hjelpetekst
 */
export default function FileUpload({
  onSelect,
  accept = 'image/*,application/pdf',
  multiple = false,
  maxFiles = 5,
  existing = [],
  onDelete,
  hint,
}) {
  const inputRef = useRef(null)
  const [busy, setBusy]   = useState(false)
  const [limitErr, setLimitErr] = useState(null)

  async function handleChange(e) {
    const files = [...e.target.files]
    if (!files.length) return

    const slots = maxFiles - existing.length
    if (slots <= 0) {
      setLimitErr(`Maks ${maxFiles} filer tillatt`)
      if (inputRef.current) inputRef.current.value = ''
      return
    }
    setLimitErr(null)

    const toProcess = files.slice(0, slots)
    if (files.length > slots) {
      setLimitErr(`Bare ${slots} til er tillatt — ${files.length - slots} fil${files.length - slots > 1 ? 'er' : ''} ble ikke lagt til`)
    }

    setBusy(true)
    try {
      for (const f of toProcess) {
        // Compress images client-side before upload (max 1 MB)
        const processed = isImage(f.type) ? await compressImage(f) : f
        await onSelect(processed)
      }
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const atLimit = existing.length >= maxFiles

  return (
    <div className="upload">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        className="upload-input"
        disabled={busy || atLimit}
      />
      <button
        type="button"
        className="upload-btn"
        onClick={() => inputRef.current?.click()}
        disabled={busy || atLimit}
      >
        <Icon name="upload" size={18} />
        <span>
          {busy ? 'Laster opp...' : atLimit ? `Maks ${maxFiles} filer` : 'Velg fil'}
        </span>
      </button>

      {hint && !limitErr && <p className="upload-hint">{hint}</p>}
      {limitErr && <p className="upload-hint" style={{ color: 'var(--color-warning-700)' }}>{limitErr}</p>}

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
