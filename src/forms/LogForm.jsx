// Form for logging a completed maintenance event to the maintenance_logs table.
// km_reading is only shown for vehicle categories (Bil, MC/ATV) where odometer
// tracking is meaningful.
// ensureLogId() pre-creates the log row before file upload so the storage
// path can reference the real log id. The same row is updated on final save.
import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { uploadLogAttachment, deleteFile } from '../storage'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
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
  const [confirmDeleteAtt, setConfirmDeleteAtt] = useState(null) // attachment object | null
  const [skipped, setSkipped] = useState(false)
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

  async function doDeleteAttachment(att) {
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
    } finally {
      setConfirmDeleteAtt(null)
    }
  }

  async function handleSave() {
    setSaving(true)
    setError(null)

    // km-based tasks require a km reading — unless skipped
    if (!skipped && task.interval_type === 'km' && !form.km_reading) {
      setError('Denne oppgaven er km-basert — fyll inn kilometerstand for å registrere fullføring.')
      setSaving(false)
      return
    }

    try {
      const payload = {
        task_id: task.id,
        asset_id: assetId,
        performed_on: form.performed_on || new Date().toISOString().slice(0, 10),
        cost: skipped ? null : (form.cost ? Number(form.cost) : null),
        km_reading: skipped ? null : (form.km_reading ? Number(form.km_reading) : null),
        notes: skipped ? null : (form.notes || null),
        skipped,
      }
      if (logId) {
        const { error } = await supabase
          .from('maintenance_logs')
          .update({
            performed_on: payload.performed_on,
            cost: payload.cost,
            km_reading: payload.km_reading,
            notes: payload.notes,
            skipped: payload.skipped,
          })
          .eq('id', logId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('maintenance_logs').insert(payload)
        if (error) throw error
      }

      // Skip all task-state updates when the log is deferred
      if (!skipped) {
        // For km-based tasks, advance the task's last_done_km so next_due_km
        // (a generated column) is recomputed to the next service km mark.
        if (task.interval_type === 'km' && form.km_reading) {
          await supabase
            .from('tasks')
            .update({ last_done_km: Number(form.km_reading) })
            .eq('id', task.id)
        }

        // For fixed-date tasks: mark last_done so the task moves to the
        // "Utforte vedlikeholdsoppgaver" section in the UI.
        if (task.fixed_due_date) {
          await supabase.from('tasks')
            .update({ last_done: payload.performed_on })
            .eq('id', task.id)
        }

        // For recurring fixed-date tasks: create next occurrence X years after
        // the date the task was performed.
        if (task.fixed_due_date && task.repeat_after_years) {
          const performed = new Date(payload.performed_on)
          const nextDue = new Date(performed)
          nextDue.setFullYear(nextDue.getFullYear() + task.repeat_after_years)
          const nextDueStr = nextDue.toISOString().slice(0, 10)
          await supabase.from('tasks').insert({
            asset_id:           assetId,
            title:              task.title,
            fixed_due_date:     nextDueStr,
            repeat_after_years: task.repeat_after_years,
            description:        task.description ?? null,
            notes:              task.notes       ?? null,
            priority:           task.priority    ?? 2,
          })
        }
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

      {/* Fields — grayed out when skipped */}
      <div style={{ opacity: skipped ? 0.35 : 1, pointerEvents: skipped ? 'none' : 'auto', transition: 'opacity 0.15s' }}>
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
          maxLength={1000}
        />
        <div className="field">
          <label>Bilder fra utførelsen</label>
          <FileUpload
            onSelect={handleAttachmentSelect}
            existing={attachments}
            onDelete={att => setConfirmDeleteAtt(att)}
            accept="image/*,application/pdf"
            multiple
            hint="Vis hva du gjorde — nyttig hvis du senere skal repetere"
          />
        </div>
      </div>

      {error && <div style={{ color: 'var(--color-danger-600)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-3)' }}>{error}</div>}

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 'var(--space-2)' }}>
        {/* "Tar det neste gang" toggle */}
        <label style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
          cursor: 'pointer', userSelect: 'none',
          fontSize: 'var(--font-size-sm)',
          color: skipped ? 'var(--color-warning-700)' : 'var(--color-text-muted)',
          fontWeight: skipped ? 'var(--font-weight-medium)' : 'var(--font-weight-normal)',
        }}>
          <input
            type="checkbox"
            checked={skipped}
            onChange={e => setSkipped(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: 'var(--color-warning-600)', cursor: 'pointer' }}
          />
          Tar det neste gang
        </label>

        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <Button variant="secondary" onClick={onClose}>Avbryt</Button>
          <Button onClick={handleSave} loading={saving} icon="check">Lagre logg</Button>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmDeleteAtt}
        title="Slett vedlegg"
        message={`«${confirmDeleteAtt?.file_name}» slettes permanent.`}
        confirmLabel="Slett"
        variant="danger"
        onConfirm={() => doDeleteAttachment(confirmDeleteAtt)}
        onClose={() => setConfirmDeleteAtt(null)}
      />
    </Modal>
  )
}
