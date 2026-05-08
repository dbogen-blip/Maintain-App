import { useRef, useState } from 'react'
import { supabase } from '../supabaseClient'
import { uploadAssetCover, deleteFile } from '../storage'
import Modal from '../components/Modal'
import { Input, Textarea, Select } from '../components/Input'
import Button from '../components/Button'
import Icon from '../components/Icon'
import FileUpload from '../components/FileUpload'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

const CATEGORIES = [
  'Bil', 'MC/ATV', 'Båt', 'Tilhenger', 'Campingvogn', 'Bobil',
  'Hus', 'Leilighet', 'Hytte',
  'Hage', 'Sykkel',
  'Elektriske og manuelle verktøy', 'Bensindrevne verktøy', 'Annet',
]

// Norsk registreringsnummer: 2 bokstaver + 5 siffer (med eller uten mellomrom)
const REGNR_RE = /^[A-Za-z]{2}\s?\d{4,5}$/

export default function AssetForm({ asset, onClose, onSaved }) {
  const isEdit = !!asset
  const [form, setForm] = useState({
    name: asset?.name ?? '',
    category: asset?.category ?? '',
    description: asset?.description ?? '',
    purchased_at: asset?.purchased_at ?? '',
    image_url: asset?.image_url ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [lookupState, setLookupState] = useState(null) // null | 'loading' | 'found' | 'error'
  const debounceRef = useRef(null)

  function setField(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function handleNameChange(e) {
    const val = e.target.value
    setField('name', val)

    clearTimeout(debounceRef.current)
    if (REGNR_RE.test(val.trim())) {
      setLookupState('loading')
      debounceRef.current = setTimeout(() => lookupRegnr(val.trim()), 600)
    } else {
      setLookupState(null)
    }
  }

  async function lookupRegnr(regnr) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/lookup-vehicle?regnr=${encodeURIComponent(regnr)}`
      )
      const data = await res.json()
      if (!res.ok || data.error) {
        setLookupState('error')
        return
      }
      setForm(f => ({
        ...f,
        name:        data.name        || f.name,
        category:    data.category    || f.category,
        description: data.description || f.description,
      }))
      setLookupState('found')
    } catch {
      setLookupState('error')
    }
  }

  function storagePathFromUrl(url) {
    if (!url) return null
    const marker = '/object/public/asset-images/'
    const idx = url.indexOf(marker)
    return idx >= 0 ? url.slice(idx + marker.length) : null
  }

  async function handleCoverSelect(file) {
    setError(null)
    try {
      let id = asset?.id
      if (!id) {
        const { data, error: insertErr } = await supabase
          .from('assets')
          .insert({ name: form.name || 'Ny eiendel', category: form.category || null })
          .select()
          .single()
        if (insertErr) throw insertErr
        id = data.id
        asset = data
      }
      const { url } = await uploadAssetCover(id, file)
      setField('image_url', url)
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleCoverDelete() {
    setError(null)
    try {
      const path = storagePathFromUrl(form.image_url)
      if (path) await deleteFile(path)
      setField('image_url', '')
      if (asset?.id) {
        await supabase.from('assets').update({ image_url: null }).eq('id', asset.id)
      }
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const payload = {
        name:        form.name.trim(),
        category:    form.category || null,
        description: form.description || null,
        purchased_at: form.purchased_at || null,
        image_url:   form.image_url || null,
      }
      if (!payload.name) throw new Error('Navn er påkrevd')

      if (isEdit) {
        const { error } = await supabase.from('assets').update(payload).eq('id', asset.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('assets').insert(payload)
        if (error) throw error
      }
      onSaved?.()
      onClose?.()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={isEdit ? 'Rediger eiendel' : 'Ny eiendel'} onClose={onClose}>
      <div className="field">
        <label>Navn / registreringsnummer</label>
        <div style={{ position: 'relative' }}>
          <input
            className="input"
            placeholder="f.eks. Tesla Model Y eller AB12345"
            value={form.name}
            onChange={handleNameChange}
            autoFocus
            style={{ width: '100%' }}
          />
          {lookupState === 'loading' && (
            <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', fontSize: 12 }}>
              Søker…
            </span>
          )}
          {lookupState === 'found' && (
            <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-success)' }}>
              <Icon name="check" size={16} />
            </span>
          )}
          {lookupState === 'error' && (
            <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', fontSize: 12 }}>
              Ikke funnet
            </span>
          )}
        </div>
        {lookupState === 'found' && (
          <p style={{ margin: '4px 0 0', fontSize: 'var(--font-size-xs)', color: 'var(--color-success)' }}>
            Kjøretøydata hentet fra Statens vegvesen
          </p>
        )}
      </div>

      <Select
        label="Kategori"
        value={form.category}
        onChange={e => setField('category', e.target.value)}
      >
        <option value="">— Ingen —</option>
        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
      </Select>

      <Textarea
        label="Beskrivelse"
        placeholder="Modell, årgang, serienr ..."
        value={form.description}
        onChange={e => setField('description', e.target.value)}
        rows={5}
      />

      <Input
        label="Kjøpt dato"
        type="date"
        value={form.purchased_at}
        onChange={e => setField('purchased_at', e.target.value)}
      />

      <div className="field">
        <label>Bilde</label>
        {form.image_url && (
          <div style={{ position: 'relative', marginBottom: 'var(--space-2)' }}>
            <img
              src={form.image_url}
              alt=""
              style={{
                width: '100%', maxHeight: 180, objectFit: 'cover',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)', display: 'block',
              }}
            />
            <button
              type="button"
              onClick={handleCoverDelete}
              style={{
                position: 'absolute', top: 8, right: 8,
                background: 'rgba(0,0,0,0.55)', border: 'none',
                borderRadius: '50%', width: 32, height: 32,
                cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', color: '#fff',
              }}
              title="Slett bilde"
            >
              <Icon name="trash" size={15} />
            </button>
          </div>
        )}
        <FileUpload onSelect={handleCoverSelect} accept="image/*" hint="JPEG/PNG/HEIC, opptil 25 MB" />
      </div>

      {error && <div style={{ color: 'var(--color-danger-600)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-3)' }}>{error}</div>}

      <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
        <Button variant="secondary" onClick={onClose}>Avbryt</Button>
        <Button onClick={handleSave} loading={saving}>
          {isEdit ? 'Lagre' : 'Opprett'}
        </Button>
      </div>
    </Modal>
  )
}
