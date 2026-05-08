import { useState } from 'react'
import { supabase } from './supabaseClient'
import Modal from './components/Modal'
import Button from './components/Button'
import './HouseTaskPicker.css'

const MONTH_LABELS = [
  'Januar','Februar','Mars','April','Mai','Juni',
  'Juli','August','September','Oktober','November','Desember',
]

// Vedlikeholdskalender for hus — unike oppgaver under primærmåned
const HOUSE_CALENDAR = [
  { month: 1, tasks: [
    { key: 'vannfilter_tap',   title: 'Rens vannfilter i tappekraner',                          interval_days: 365, priority: 2 },
    { key: 'sluk_vannlas',     title: 'Rens sluk og vannlåser',                                 interval_days: 182, priority: 2 },
    { key: 'vannfilter_red',   title: 'Rens vannfilter i eventuell reduksjonsventil',            interval_days: 365, priority: 2 },
    { key: 'varmtvann',        title: 'Kontroller varmtvannsbereder',                            interval_days: 365, priority: 1 },
  ]},
  { month: 2, tasks: [
    { key: 'kjokkenfilter',    title: 'Rengjør filter i kjøkkenvifte',                           interval_days: 90,  priority: 2 },
    { key: 'kull_filter',      title: 'Vurder å skifte kullfilter i kjøkkenventilator',          interval_days: 730, priority: 2 },
    { key: 'varmepumpe',       title: 'Rengjør eventuell varmepumpe iht. bruksanvisning',        interval_days: 182, priority: 2 },
  ]},
  { month: 3, tasks: [
    { key: 'hvitevarer_filter',title: 'Rens filter i vaskemaskin, oppvaskmaskin og tørketrommel',interval_days: 365, priority: 2 },
    { key: 'stikkrenne',       title: 'Sjekk stikkrenne under innkjørsel',                      interval_days: 365, priority: 2 },
    { key: 'sno_husvegg',      title: 'Fjern eventuell snø inntil husvegg',                     interval_days: 365, priority: 2 },
  ]},
  { month: 4, tasks: [
    { key: 'takrenner',        title: 'Rengjør takrenner og sjekk nedløp',                      interval_days: 182, priority: 2 },
    { key: 'avtrekk_vatrom',   title: 'Rens avtrekksvifte i våtrom',                            interval_days: 182, priority: 2 },
    { key: 'hengsler_las',     title: 'Smør hengsler og låser',                                 interval_days: 182, priority: 2 },
    { key: 'ildsted',          title: 'Rengjør eventuelt ildsted grundig',                      interval_days: 365, priority: 2 },
  ]},
  { month: 5, tasks: [
    { key: 'tak_pipe',         title: 'Se over tak og pipe',                                    interval_days: 365, priority: 1 },
    { key: 'kaldt_loft',       title: 'Inspiser kaldt loft',                                    interval_days: 365, priority: 2 },
    { key: 'kjeller',          title: 'Inspiser kjeller og eventuelt krypkjeller',              interval_days: 365, priority: 2 },
    { key: 'malejobb',         title: 'Planlegg eventuell malejobb ute',                        interval_days: 365, priority: 3 },
  ]},
  { month: 6, tasks: [
    { key: 'oppvask_slange',   title: 'Sjekk slanger til oppvaskmaskin',                        interval_days: 365, priority: 1 },
    { key: 'vask_slange',      title: 'Sjekk slanger til vaskemaskin',                          interval_days: 365, priority: 1 },
    { key: 'garasje',          title: 'Inspiser og rengjør eventuell garasje/garasjeport',      interval_days: 365, priority: 2 },
    { key: 'husvegg_vask',     title: 'Vask husvegg, terrasse og gjerde',                       interval_days: 365, priority: 2 },
    { key: 'husvegg_mal',      title: 'Mal husvegg/terrasse/gjerde om nødvendig',               interval_days: 1825,priority: 3 },
  ]},
  { month: 7, tasks: [
    { key: 'royk_varsler',     title: 'Sjekk røykvarslere',                                     interval_days: 182, priority: 1 },
    { key: 'brannslukker',     title: 'Sjekk brannslukningsapparater',                          interval_days: 365, priority: 1 },
    { key: 'hage_grofter',     title: 'Sjekk hage, fall og grøfter',                           interval_days: 365, priority: 2 },
  ]},
  { month: 8, tasks: [
    { key: 'dusjhode',         title: 'Desinfiser dusjhoder',                                   interval_days: 365, priority: 2 },
    { key: 'fasade',           title: 'Kontroller fasade og yttervegg',                         interval_days: 365, priority: 2 },
    { key: 'vegetasjon',       title: 'Sørg for at vegetasjon ikke vokser inn bak husets kledning', interval_days: 365, priority: 2 },
    { key: 'skadedyr',         title: 'Vær obs på eventuelle skadedyr',                         interval_days: 365, priority: 2 },
  ]},
  { month: 9, tasks: [
    { key: 'el_kontakter',     title: 'Se over elektriske kontakter, brytere og motorer',       interval_days: 365, priority: 1 },
    { key: 'viftemotor',       title: 'Sjekk viftemotor på ventilasjonsanlegg',                 interval_days: 365, priority: 2 },
  ]},
  { month: 10, tasks: [
    { key: 'utekraner',        title: 'Steng utekraner',                                        interval_days: 365, priority: 2 },
    { key: 'vifteovner',       title: 'Rens filtre i vifteovner',                               interval_days: 365, priority: 2 },
    { key: 'maling_inn',       title: 'Ta inn maling o.l. som kan fryse',                       interval_days: 365, priority: 2 },
    { key: 'robotgress',       title: 'Klargjør eventuell robotgressklipper for vinteren',      interval_days: 365, priority: 2 },
  ]},
  { month: 11, tasks: [
    { key: 'ventilasjon_filter',title:'Bytt filter i ventilasjonsaggregat og rengjør',          interval_days: 365, priority: 2 },
    { key: 'tetningslister',   title: 'Sjekk tetningslister på ytterdør og vinduer',            interval_days: 1825,priority: 2 },
  ]},
]

// Beregn neste forekomst av en gitt måned (1-12), returner ISO-dato
function nextOccurrence(month) {
  const today = new Date()
  const year = today.getFullYear()
  const targetYear = month >= today.getMonth() + 1 ? year : year + 1
  return `${targetYear}-${String(month).padStart(2, '0')}-01`
}

// Sett last_done slik at next_due = nextOccurrence (server beregner last_done + interval_days)
function syntheticLastDone(month, intervalDays) {
  const next = new Date(nextOccurrence(month))
  next.setDate(next.getDate() - intervalDays)
  return next.toISOString().slice(0, 10)
}

function intervalLabel(days) {
  if (days >= 1825) return '1x/5 år'
  if (days >= 730) return '1x/2 år'
  if (days >= 365) return '1x/år'
  if (days >= 182) return '2x/år'
  if (days >= 90) return '4x/år'
  return `hver ${days}d`
}

export default function HouseTaskPicker({ assetId, onClose, onSaved }) {
  const [selected, setSelected] = useState(() => new Set())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function toggle(key) {
    setSelected(s => {
      const next = new Set(s)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
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
    setSelected(new Set(HOUSE_CALENDAR.flatMap(m => m.tasks.map(t => t.key))))
  }

  async function handleAdd() {
    setSaving(true)
    setError(null)
    try {
      const all = HOUSE_CALENDAR.flatMap(m => m.tasks.map(t => ({ ...t, month: m.month })))
      const rows = all
        .filter(t => selected.has(t.key))
        .map(t => ({
          asset_id: assetId,
          title: t.title,
          interval_days: t.interval_days,
          priority: t.priority,
          last_done: syntheticLastDone(t.month, t.interval_days),
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
    <Modal title="Legg til vedlikeholdsplan for hus" onClose={onClose} size="lg">
      <div className="htp-intro">
        <p>Velg oppgavene du vil legge til. Basert på norsk vedlikeholdskalender for hus.</p>
        <button type="button" className="htp-select-all" onClick={selectAll}>Velg alle</button>
      </div>

      <div className="htp-months">
        {HOUSE_CALENDAR.map(({ month, tasks }) => {
          const keys = tasks.map(t => t.key)
          const allOn = keys.every(k => selected.has(k))
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
