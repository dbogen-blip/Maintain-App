// Form for logging a completed maintenance event to the maintenance_logs table.
// km_reading is only shown for vehicle categories (Bil, MC/ATV) where odometer
// tracking is meaningful.
// Auto-renewal: when a fixed_due_date task is marked done, a new identical task
// row is inserted with fixed_due_date + 1 year. This preserves the original
// calendar date (e.g. annual service always due in March) rather than rolling
// forward from the completion date. The !logId guard prevents duplicate renewal
// if the log row was pre-created by ensureLogId().
// ensureLogId() pre-creates the log row before file upload so the storage
// path can reference the real log id. The same row is updated on final save.
import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { uploadLogAttachment, deleteFile } from '../storage'
import Modal from '../components/Modal'
import { Input, Textarea } from '../components/Input'
import Button from '../components/Button'
import FileUpload from '../components/FileUpload'

export default function LogForm({ task, assetId, assetCategory, onClose, onSaved }) {
  const showKm = assetCategory === 'Bil' || assetCategory === 'MC/ATV'
  const [form, setForm] = useState({
    performed_on: new Date().toISOString().slice(0, 10),
    cost: '',
    km_reading: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [logId, setLogId] = useState(null)
  const [attachments, setAttachments] = useState([])

  function setField(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function ensureLogId() {
    if (logId) return logId
    const { data, error } = await supabase
      .from('maintenance_logs')
      .insert({
        task_id: task.id,
        asset_id: assetId,
        performed_on: form.performed_on,
        cost: form.cost ? Number(form.cost) : null,
        notes: form.notes || null,
      })
      .select()
      .single()
    if (error) throw error
    setLogId(data.id)
    return data.id
  }

  async function handleAttachmentSelect(file) {
    setError(null)
    try {
      const id = await ensureLogId()
      const meta = await uploadLogAttachment(id, file)
      const { data, error } = await supabase
        .from('maintenance_log_attachments')
        .insert({
          log_id: id,
          file_path: meta.file_path,
          file_name: meta.file_name,
          mime_type: meta.mime_type,
          size_bytes: meta.size_bytes,
        })
        .select()
        .single()
      if (error) throw error
      setAttachments(prev => [data, ...prev])
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleAttachmentDelete(att) {
    if (!confirm(`Slette ${att.file_name}?`)) return
    try {
      await deleteFile(att.file_path)
      const { error } = await supabase
        .from('maintenance_log_attachments')
        .delete()
        .eq('id', att.id)
      if (error) throw error
      setAttachments(prev => prev.filter(a => a.id !== att.id))
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const payload = {
        task_id: task.id,
        asset_id: assetId,
        performed_on: form.performed_on || new Date().toISOString().slice(0, 10),
        cost: form.cost ? Number(form.cost) : null,
        km_reading: form.km_reading ? Number(form.km_reading) : null,
        notes: form.notes || null,
      }
      if (logId) {
        const { error } = await supabase
          .from('maintenance_logs')
          .update({
            performed_on: payload.performed_on,
            cost: payload.cost,
            km_reading: payload.km_reading,
            notes: payload.notes,
          })
          .eq('id', logId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('maintenance_logs').insert(payload)
        if (error) throw error
      }

      // Auto-renewal: advance by exactly one year from the original fixed date,
      // not from today, so the calendar anchor is preserved indefinitely.
      if (task.fixed_due_date && !logId) {
        const [y, m, d] = task.fixed_due_date.split('-')
        const nextDate = `${parseInt(y) + 1}-${m}-${d}`
        await supabase.from('tasks').insert({
          asset_id:      assetId,
          title:         task.title,
          priority:      task.priority,
          description:   task.description,
          notes:         task.notes,
          fixed_due_date: nextDate,
          interval_days: null,
          last_done:     null,
        })
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
    <Modal title={`Logg utført: ${task.title}`} onClose={onClose}>
      <Input
        label="Når ble det utført?"
        type="date"
        value={form.performed_on}
        onChange={e => setField('performed_on', e.target.value)}
      />
      <div style={{ display: 'grid', gridTemplateColumns: showKm ? '1fr 1fr' : '1fr', gap: 'var(--space-3)' }}>
        <Input
          label="Kostnad (NOK)"
          type="number"
          step="0.01"
          placeholder="f.eks. 1250"
          value={form.cost}
          onChange={e => setField('cost', e.target.value)}
        />
        {showKm && (
          <Input
            label="Km-stand"
            type="number"
            placeholder="f.eks. 85000"
            value={form.km_reading}
            onChange={e => setField('km_reading', e.target.value)}
          />
        )}
      </div>
      <Textarea
        label="Notater"
        placeholder="Hva ble gjort, observasjoner ..."
        value={form.notes}
        onChange={e => setField('notes', e.target.value)}
        rows={3}
      />

      <div className="field">
        <label>Bilder fra utførelsen</label>
        <FileUpload
          onSelect={handleAttachmentSelect}
          existing={attachments}
          onDelete={handleAttachmentDelete}
          accept="image/*,application/pdf"
          multiple
          hint="Vis hva du gjorde — nyttig hvis du senere skal repetere"
        />
      </div>

      {error && <div style={{ color: 'var(--color-danger-600)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-3)' }}>{error}</div>}

      <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
        <Button variant="secondary" onClick={onClose}>Avbryt</Button>
        <Button onClick={handleSave} loading={saving} icon="check">Lagre logg</Button>
      </div>
    </Modal>
  )
}
