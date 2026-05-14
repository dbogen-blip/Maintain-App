// Form for creating and editing maintenance tasks.
// Two scheduling modes:
//   'interval'    — repeating task; next_due is computed in the DB as
//                   last_done + interval_days (generated column, read-only here).
//   'multi-fixed' — one or more specific calendar dates (up to 6 per save).
//                   Each date is stored as a separate task row so that every
//                   occurrence has its own due date, log history, and lifecycle.
//                   When editing an existing fixed task, only the first date
//                   is applied to avoid unintended row multiplication.
// ensureTaskId() inserts a draft task row before file upload so the storage
// path can include the real task id. The same id is reused on final save.
import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { uploadTaskAttachment, deleteFile } from '../storage'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import { Input, Textarea, Select } from '../components/Input'
import Button from '../components/Button'
import Icon from '../components/Icon'
import FileUpload from '../components/FileUpload'

// Vehicle/machine categories where km-based intervals make sense
const KM_CATEGORIES = ['Bil', 'MC/ATV', 'Lastebil/Buss', 'Traktor/Maskin', 'Campingvogn']

export default function TaskForm({ assetId, task, assetCategory, onClose, onSaved }) {
  const isEdit    = !!task
  const isVehicle = KM_CATEGORIES.includes(assetCategory)

  const [mode, setMode] = useState(
    task?.interval_type === 'km' ? 'km' :
    task?.fixed_due_date         ? 'multi-fixed' : 'interval'
  )
  const [form, setForm] = useState({
    title:          task?.title         ?? '',
    interval_days:  task?.interval_days ?? 180,
    interval_km:    task?.interval_km   ?? 15000,
    last_done:      task?.last_done     ?? '',
    last_done_km:   task?.last_done_km  ?? '',
    priority:       task?.priority      ?? 2,
    description:    task?.description   ?? '',
    notes:          task?.notes         ?? '',
  })
  const [fixedDates, setFixedDates] = useState(task?.fixed_due_date ? [task.fixed_due_date] : [''])
  // null = one-time, number = repeats every N years after completion
  const [repeatYears, setRepeatYears] = useState(task?.repeat_after_years ?? null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [attachments, setAttachments] = useState([])
  const [taskId, setTaskId] = useState(task?.id ?? null)
  const [confirmDeleteAtt, setConfirmDeleteAtt] = useState(null) // attachment | null

  useEffect(() => {
    if (task?.id) loadAttachments(task.id)
  }, [task?.id])

  function setField(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function loadAttachments(id) {
    const { data } = await supabase
      .from('task_attachments')
      .select('*')
      .eq('task_id', id)
      .order('created_at', { ascending: false })
    setAttachments(data ?? [])
  }

  async function ensureTaskId() {
    if (taskId) return taskId
    const payload = {
      asset_id: assetId,
      title: form.title || 'Ny oppgave',
      priority: Number(form.priority) || 2,
    }
    if (mode === 'interval') {
      payload.interval_type = 'days'
      payload.interval_days = Number(form.interval_days) || 30
      payload.last_done     = form.last_done || null
    } else if (mode === 'km') {
      payload.interval_type = 'km'
      payload.interval_km   = Number(form.interval_km) || 15000
    } else {
      payload.fixed_due_date = form.fixed_due_date || null
    }
    const { data, error } = await supabase.from('tasks').insert(payload).select().single()
    if (error) throw error
    setTaskId(data.id)
    return data.id
  }

  async function handleAttachmentSelect(file) {
    setError(null)
    try {
      const id = await ensureTaskId()
      const meta = await uploadTaskAttachment(id, file)
      const { data, error } = await supabase
        .from('task_attachments')
        .insert({ task_id: id, file_path: meta.file_path, file_name: meta.file_name, mime_type: meta.mime_type, size_bytes: meta.size_bytes })
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
      const { error } = await supabase.from('task_attachments').delete().eq('id', att.id)
      if (error) throw error
      setAttachments(prev => prev.filter(a => a.id !== att.id))
    } catch (e) {
      setError(e.message)
    } finally {
      // Always reset so the dialog can be opened again for the next attachment
      setConfirmDeleteAtt(null)
    }
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const base = {
        asset_id:    assetId,
        title:       form.title.trim(),
        priority:    Number(form.priority),
        description: form.description || null,
        notes:       form.notes       || null,
      }
      if (!base.title) throw new Error('Tittel er påkrevd')

      if (mode === 'interval') {
        const payload = {
          ...base,
          interval_type:  'days',
          interval_days:  Number(form.interval_days),
          last_done:      form.last_done || new Date().toISOString().slice(0, 10),
          fixed_due_date: null,
          interval_km:    null,
          last_done_km:   null,
        }
        if (!Number.isFinite(payload.interval_days) || payload.interval_days < 1)
          throw new Error('Intervall må være minst 1 dag')
        if (taskId) {
          const { error } = await supabase.from('tasks').update(payload).eq('id', taskId)
          if (error) throw error
        } else {
          const { error } = await supabase.from('tasks').insert(payload)
          if (error) throw error
        }
      } else if (mode === 'km') {
        const km = Number(form.interval_km)
        if (!Number.isFinite(km) || km < 1) throw new Error('Km-intervall må være minst 1')
        const payload = {
          ...base,
          interval_type:  'km',
          interval_km:    km,
          last_done_km:   form.last_done_km ? Number(form.last_done_km) : null,
          interval_days:  null,
          last_done:      null,
          fixed_due_date: null,
        }
        if (taskId) {
          const { error } = await supabase.from('tasks').update(payload).eq('id', taskId)
          if (error) throw error
        } else {
          const { error } = await supabase.from('tasks').insert(payload)
          if (error) throw error
        }
      } else {
        // multi-fixed: create one row per date
        const dates = fixedDates.filter(d => d)
        if (!dates.length) throw new Error('Legg til minst én dato')

        const ry = repeatYears != null ? Number(repeatYears) : null
        if (ry !== null && (!Number.isFinite(ry) || ry < 1 || ry > 60))
          throw new Error('Gjentakelse må være mellom 1 og 60 år')

        const rows = dates.map(d => ({
          ...base,
          fixed_due_date:     d,
          interval_days:      null,
          last_done:          null,
          repeat_after_years: ry,
        }))
        if (taskId) {
          // When editing an existing fixed task, apply only the first date to avoid creating extra rows
          const { error } = await supabase.from('tasks').update({
            ...base,
            fixed_due_date:     dates[0],
            interval_days:      null,
            last_done:          null,
            repeat_after_years: ry,
          }).eq('id', taskId)
          if (error) throw error
        } else {
          const { error } = await supabase.from('tasks').insert(rows)
          if (error) throw error
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
    <Modal title={isEdit ? 'Rediger oppgave' : 'Ny oppgave'} onClose={onClose} size="lg">
      <Input
        label="Hva skal gjøres"
        placeholder="f.eks. Oljeskift"
        value={form.title}
        onChange={e => setField('title', e.target.value)}
        autoFocus
      />

      <div className="field">
        <label>Planlegging</label>
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`chip${mode === 'interval' ? ' chip-active' : ''}`}
            onClick={() => setMode('interval')}
          >
            Gjentagende (intervall)
          </button>
          <button
            type="button"
            className={`chip${mode === 'multi-fixed' ? ' chip-active' : ''}`}
            onClick={() => setMode('multi-fixed')}
          >
            Faste datoer
          </button>
          {isVehicle && (
            <button
              type="button"
              className={`chip${mode === 'km' ? ' chip-active' : ''}`}
              onClick={() => setMode('km')}
            >
              Kjørelengde (km)
            </button>
          )}
        </div>
      </div>

      {mode === 'interval' ? (
        <>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-2)' }}>
            {[
              { days: 30,  label: '1 mnd'  },
              { days: 90,  label: '3 mnd'  },
              { days: 180, label: '6 mnd'  },
              { days: 365, label: '1 år'   },
            ].map(({ days, label }) => (
              <button
                key={days}
                type="button"
                className={`chip${Number(form.interval_days) === days ? ' chip-active' : ''}`}
                onClick={() => setField('interval_days', days)}
              >{label}</button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', alignItems: 'start' }}>
            <Input
              label="Intervall (dager)"
              type="number"
              min="1"
              value={form.interval_days}
              onChange={e => setField('interval_days', e.target.value)}
              hint="Hvor ofte skal det utføres"
            />
            <Input
              label="Sist utført"
              type="date"
              value={form.last_done}
              onChange={e => setField('last_done', e.target.value)}
              hint="Tom = teller fra i dag"
            />
          </div>
        </>
      ) : mode === 'km' ? (
        <>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-2)' }}>
            {[
              { km: 5000,  label:  '5 000 km' },
              { km: 10000, label: '10 000 km' },
              { km: 15000, label: '15 000 km' },
              { km: 30000, label: '30 000 km' },
            ].map(({ km, label }) => (
              <button
                key={km}
                type="button"
                className={`chip${Number(form.interval_km) === km ? ' chip-active' : ''}`}
                onClick={() => setField('interval_km', km)}
              >{label}</button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', alignItems: 'start' }}>
            <Input
              label="Km-intervall"
              type="number"
              min="1"
              placeholder="f.eks. 15000"
              value={form.interval_km}
              onChange={e => setField('interval_km', e.target.value)}
              hint="Antall km mellom hver utførelse"
            />
            <Input
              label="Sist utført ved (km)"
              type="number"
              min="0"
              placeholder="f.eks. 75000"
              value={form.last_done_km}
              onChange={e => setField('last_done_km', e.target.value)}
              hint="Tom = regn fra 0 km"
            />
          </div>
        </>
      ) : (
        <div className="field">
          <label>Datoer (opptil 10)</label>
          {fixedDates.map((d, i) => (
            <div key={i} style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
              <div style={{ flex: 1 }}>
                <input
                  type="date"
                  value={d}
                  onChange={e => setFixedDates(prev => prev.map((x, idx) => idx === i ? e.target.value : x))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--font-size-sm)',
                    background: 'var(--color-surface)',
                    color: 'var(--color-text)',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
              {fixedDates.length > 1 && (
                <button
                  type="button"
                  onClick={() => setFixedDates(prev => prev.filter((_, idx) => idx !== i))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4, lineHeight: 1 }}
                >
                  <Icon name="x" size={16} />
                </button>
              )}
            </div>
          ))}
          {fixedDates.length < 10 && (
            <button
              type="button"
              className="chip"
              onClick={() => setFixedDates(prev => [...prev, ''])}
              style={{ marginTop: 'var(--space-1)' }}
            >
              <Icon name="plus" size={14} /> Legg til dato
            </button>
          )}

          {/* Recurrence toggle */}
          <div style={{
            marginTop: 'var(--space-4)',
            padding: 'var(--space-3) var(--space-4)',
            background: 'var(--color-surface-alt)',
            borderRadius: 'var(--radius-lg)',
          }}>
            <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', display: 'block', marginBottom: 'var(--space-3)' }}>
              Gjentakelse
            </label>
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`chip${repeatYears === null ? ' chip-active' : ''}`}
                onClick={() => setRepeatYears(null)}
              >
                Engangshendelse
              </button>
              <button
                type="button"
                className={`chip${repeatYears !== null ? ' chip-active' : ''}`}
                onClick={() => setRepeatYears(repeatYears ?? 1)}
              >
                Gjentar seg
              </button>
            </div>

            {repeatYears !== null && (
              <div style={{ marginTop: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>Neste oppgave opprettes</span>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={repeatYears}
                  onChange={e => {
                    const v = Math.max(1, Math.min(60, parseInt(e.target.value, 10) || 1))
                    setRepeatYears(v)
                  }}
                  style={{
                    width: 64,
                    padding: '6px 10px',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--font-size-sm)',
                    background: 'var(--color-surface)',
                    color: 'var(--color-text)',
                    fontFamily: 'inherit',
                    textAlign: 'center',
                  }}
                />
                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
                  år etter at oppgaven er utført
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      <Select
        label="Prioritet"
        value={form.priority}
        onChange={e => setField('priority', e.target.value)}
      >
        <option value="1">Høy</option>
        <option value="2">Normal</option>
        <option value="3">Lav</option>
      </Select>

      <Textarea
        label="Hvordan utføre vedlikeholdet"
        placeholder="Steg-for-steg, verktøy som trengs, momenter ..."
        value={form.description}
        onChange={e => setField('description', e.target.value)}
        rows={5}
        hint="Lang beskrivelse — bruk vedlegg under for PDF, bilder ol."
      />

      <Textarea
        label="Notater"
        placeholder="Korte notater"
        value={form.notes}
        onChange={e => setField('notes', e.target.value)}
        rows={2}
      />

      <div className="field">
        <label>Vedlegg</label>
        <FileUpload
          onSelect={handleAttachmentSelect}
          existing={attachments}
          onDelete={att => setConfirmDeleteAtt(att)}
          accept="image/*,application/pdf,.doc,.docx,.txt"
          multiple
          hint="Bilder, PDF, eller tekstdokumenter"
        />
      </div>

      {error && <div style={{ color: 'var(--color-danger-600)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-3)' }}>{error}</div>}

      <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
        <Button variant="secondary" onClick={onClose}>Avbryt</Button>
        <Button onClick={handleSave} loading={saving}>
          {isEdit ? 'Lagre' : 'Opprett'}
        </Button>
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
