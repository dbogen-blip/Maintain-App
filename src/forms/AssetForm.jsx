import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { uploadAssetCover, publicUrl, deleteFile } from '../storage'
import Modal from '../components/Modal'
import { Input, Textarea, Select } from '../components/Input'
import Button from '../components/Button'
import Icon from '../components/Icon'
import FileUpload from '../components/FileUpload'

const CATEGORIES = ['Bil', 'Båt', 'Hus', 'Leilighet', 'Hytte', 'Bobil', 'Hage', 'Sykkel', 'MC', 'Elektriske og manuelle verktøy', 'Bensindrevne verktøy', 'Annet']

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

  function setField(k, v) { setForm(f => ({ ...f, [k]: v })) }

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
          .insert({
            name: form.name || 'Ny eiendel',
            category: form.category || null,
          })
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
        name: form.name.trim(),
        category: form.category || null,
        description: form.description || null,
        purchased_at: form.purchased_at || null,
        image_url: form.image_url || null,
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
      <Input
        label="Navn"
        placeholder="f.eks. Tesla Model Y"
        value={form.name}
        onChange={e => setField('name', e.target.value)}
        autoFocus
      />
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
        rows={3}
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
                width: '100%',
                maxHeight: 180,
                objectFit: 'cover',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                display: 'block',
              }}
            />
            <button
              type="button"
              onClick={handleCoverDelete}
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                background: 'rgba(0,0,0,0.55)',
                border: 'none',
                borderRadius: '50%',
                width: 32,
                height: 32,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
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
