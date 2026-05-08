import { useState } from 'react'
import { supabase } from './supabaseClient'
import Modal from './components/Modal'
import Button from './components/Button'
import './HouseTaskPicker.css'   // gjenbruker samme CSS

const MONTH_LABELS = [
  'Januar','Februar','Mars','April','Mai','Juni',
  'Juli','August','September','Oktober','November','Desember',
]

// Norsk bilvedlikeholdskalender — tidsbaserte intervaller
const CAR_CALENDAR = [
  { month: 1, tasks: [
    { key: 'dekktrykk',       title: 'Kontroller dekktrykk',                     interval_days: 30,   priority: 2 },
  ]},
  { month: 2, tasks: [
    { key: 'batteri',         title: 'Kontroll av batteri',                       interval_days: 182,  priority: 2 },
  ]},
  { month: 4, tasks: [
    { key: 'dekkskift_var',   title: 'Dekkskift (sommer)',                        interval_days: 182,  priority: 1 },
  ]},
  { month: 5, tasks: [
    { key: 'vask',            title: 'Vaske bilen',                               interval_days: 30,   priority: 3 },
    { key: 'voks',            title: 'Vokse bilen',                               interval_days: 365,  priority: 3 },
    { key: 'rust',            title: 'Rustkontroll',                              interval_days: 365,  priority: 2 },
  ]},
  { month: 6, tasks: [
    { key: 'motorolje',       title: 'Skifte motorolje og oljefilter',            interval_days: 365,  priority: 1 },
  ]},
  { month: 8, tasks: [
    { key: 'bremsevaeske',    title: 'Bytte bremsevæske',                         interval_days: 730,  priority: 1 },
    { key: 'eu_kontroll',     title: 'EU-kontroll',                               interval_days: 730,  priority: 1 },
  ]},
  { month: 9, tasks: [
    { key: 'kupéfilter',      title: 'Bytte kupéfilter',                          interval_days: 365,  priority: 2 },
    { key: 'viskerblader',    title: 'Bytte viskerblader',                        interval_days: 365,  priority: 2 },
  ]},
  { month: 10, tasks: [
    { key: 'dekkskift_host',  title: 'Dekkskift (vinter)',                        interval_days: 182,  priority: 1 },
  ]},
  { month: 11, tasks: [
    { key: 'registerreim',    title: 'Kontroller/bytte registerreim eller -kjede', interval_days: 1825, priority: 1 },
    { key: 'automatgir',      title: 'Service automatgir',                        interval_days: 1825, priority: 2 },
  ]},
]

function nextOccurrence(month) {
  const now = new Date()
  const year = now.getMonth() + 1 > month ? now.getFullYear() + 1 : now.getFullYear()
  return new Date(year, month - 1, 1)
}

function syntheticLastDone(month, intervalDays) {
  const next = new Date(nextOccurrence(month))
  next.setDate(next.getDate() - intervalDays)
  return next.toISOString().slice(0, 10)
}

function intervalLabel(days) {
  if (days >= 1825) return '1x/5 år'
  if (days >= 730)  return '1x/2 år'
  if (days >= 365)  return '1x/år'
  if (days >= 182)  return '2x/år'
  if (days >= 90)   return '4x/år'
  return `hver ${days}d`
}

export default function CarTaskPicker({ assetId, onClose, onSaved }) {
  const [selected, setSelected] = useState(() => new Set())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function toggle(key) {
    setSelected(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n })
  }

  function toggleMonth(tasks) {
    const keys = tasks.map(t => t.key)
    const allOn = keys.every(k => selected.has(k))
    setSelected(s => {
      const next = new Set(s)
      keys.forEach(k => allOn ? next.delete(k) : next.add(k))
      return next
    })
  }

  function selectAll() {
    setSelected(new Set(CAR_CALENDAR.flatMap(m => m.tasks.map(t => t.key))))
  }

  async function handleAdd() {
    setSaving(true)
    setError(null)
    try {
      const all = CAR_CALENDAR.flatMap(m => m.tasks.map(t => ({ ...t, month: m.month })))
      const rows = all
        .filter(t => selected.has(t.key))
        .map(t => ({
          asset_id:      assetId,
          title:         t.title,
          interval_days: t.interval_days,
          priority:      t.priority,
          last_done:     syntheticLastDone(t.month, t.interval_days),
        }))

      if (rows.length === 0) { onClose?.(); return }

      const { error } = await supabase.from('tasks').insert(rows)
      if (error) throw error
      onSaved?.()
      onClose?.()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const total = selected.size

  return (
    <Modal title="Legg til vedlikeholdsplan for bil" onClose={onClose} size="lg">
      <div className="htp-intro">
        <p>Velg oppgavene du vil legge til. Basert på anbefalt norsk bilvedlikehold.</p>
        <button type="button" className="htp-select-all" onClick={selectAll}>Velg alle</button>
      </div>

      <div className="htp-months">
        {CAR_CALENDAR.map(({ month, tasks }) => {
          const keys = tasks.map(t => t.key)
          const allOn  = keys.every(k => selected.has(k))
          const someOn = keys.some(k => selected.has(k))
          return (
            <div key={month} className="htp-month">
              <button
                type="button"
                className={`htp-month-label${allOn ? ' htp-month-label--on' : someOn ? ' htp-month-label--partial' : ''}`}
                onClick={() => toggleMonth(tasks)}
                title={allOn ? 'Fjern alle' : 'Velg alle'}
              >
                <span className="htp-month-check">{allOn ? '✓' : someOn ? '–' : ''}</span>
                {MONTH_LABELS[month - 1]}
              </button>
              <ul className="htp-tasks">
                {tasks.map(task => (
                  <li key={task.key}>
                    <label className={`htp-task${selected.has(task.key) ? ' htp-task--on' : ''}`}>
                      <input
                        type="checkbox"
                        checked={selected.has(task.key)}
                        onChange={() => toggle(task.key)}
                      />
                      <span className="htp-task-title">{task.title}</span>
                      <span className="htp-task-freq">{intervalLabel(task.interval_days)}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      {error && <p className="htp-error">{error}</p>}

      <div className="htp-footer">
        <span className="muted">
          {total === 0 ? 'Ingen valgt' : `${total} oppgave${total === 1 ? '' : 'r'} valgt`}
        </span>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <Button variant="secondary" onClick={onClose}>Avbryt</Button>
          <Button onClick={handleAdd} loading={saving} disabled={total === 0}>
            Legg til {total > 0 ? total : ''} oppgave{total === 1 ? '' : 'r'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
