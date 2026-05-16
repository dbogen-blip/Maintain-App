import { useState } from 'react'
import { supabase } from './supabaseClient'
import Modal from './components/Modal'
import Button from './components/Button'
import './HouseTaskPicker.css'   // gjenbruker samme CSS

// Vår- og høstoppgaver — opprettes som to faste datoer (vår + høst) per oppgave
const SEASONAL_TASKS = [
  {
    key: 'lys_el',
    title: 'Kontroller lys og elektrisk',
    description: `Sjekk at alle lys fungerer:\n• bremselys\n• blinklys\n• parklys\n• ryggelys\n\nKoble til hengeren og gå rundt mens lysene testes. Kontroller også kontakten for rust, fukt eller løse ledninger. Bruk kontaktspray ved dårlig kontakt.`,
    notes: 'Kontaktspray',
    priority: 2,
  },
  {
    key: 'dekk_hjul',
    title: 'Sjekk dekk og hjul',
    description: `Kontroller lufttrykk og se etter:\n• sprekker\n• tørrråte\n• skjev slitasje\n\nEtterstram hjulmutre og kjenn etter slark eller ulyder i hjullager når hjulet roteres. Dekk som står lenge kan bli dårlige selv med godt mønster.`,
    notes: 'Lufttrykkmåler, momentnøkkel for hjulmutre',
    priority: 2,
  },
  {
    key: 'kobling',
    title: 'Vedlikehold kobling og bevegelige deler',
    description: `Kontroller kulekobling og sikkerhetswire for skader eller rust. Smør:\n• kobling\n• støttehjul\n• hengsler\n• låser\n\nBruk egnet fett eller smørespray for å hindre rust og treg mekanikk. Hvis det er smørenippel på drag, pumpes fett inn.`,
    notes: 'Lithiumfett, smørespray, fettsprøyte',
    priority: 2,
  },
  {
    key: 'bremser',
    title: 'Kontroller bremser og understell',
    description: `På bremsede hengere:\n• test håndbrekk\n• sjekk påløpsbrems\n• se etter rust eller tregheter\n\nUndersøk også ramme, drag og underside for rust, sprekker eller løse bolter. Vask gjerne undersiden etter vinterbruk.`,
    notes: 'Verktøy for bremsejustering (om aktuelt)',
    priority: 1,
  },
  {
    key: 'vask_rust',
    title: 'Vask og rustbeskytt hengeren',
    description: `Vask hengeren grundig minst én gang i året, spesielt:\n• underside\n• hjulbuer\n• rundt bolter og sveiser\n\nFjern salt og skitt, og behandle utsatte områder med rustbeskyttelse. Kontroller samtidig gulv og treverk for fukt eller råte.`,
    notes: 'Rustbeskyttelse (f.eks. Dinitrol), høytrykkspyler',
    priority: 2,
  },
]

// Periodevise oppgaver — opprettes som én fast dato med gjentakelse
const PERIODIC_TASKS = [
  {
    key: 'bremseservice',
    title: 'Bremseservice på verksted',
    description: 'Komplett bremseservice utført av autorisert verksted. Inkluderer gjennomgang av bremsetrommer/skiver, bremsebånd/klosser og påløpsbrems.',
    notes: '',
    priority: 1,
    repeatYears: 5,
  },
]

// Neste forekomst av en dato (måneddag) — aldri i fortiden
function nextDate(month, day) {
  const today = new Date()
  const y = today.getFullYear()
  const d = new Date(y, month - 1, day)
  if (d <= today) d.setFullYear(y + 1)
  return d.toISOString().slice(0, 10)
}

export default function TrailerTaskPicker({ assetId, onClose, onSaved }) {
  const [selected, setSelected]     = useState(() => new Set(
    [...SEASONAL_TASKS, ...PERIODIC_TASKS].map(t => t.key)
  ))
  const [springDate, setSpringDate] = useState(() => nextDate(4, 15))  // 15. april
  const [fallDate,   setFallDate]   = useState(() => nextDate(10, 1))  // 1. oktober
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState(null)

  function toggle(key) {
    setSelected(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n })
  }

  function selectAll() {
    setSelected(new Set([...SEASONAL_TASKS, ...PERIODIC_TASKS].map(t => t.key)))
  }

  async function handleAdd() {
    if (!springDate || !fallDate) { setError('Velg begge datoer'); return }
    setSaving(true)
    setError(null)
    try {
      const rows = []

      // Seasonal: two fixed-date rows per task (spring + fall), annual repeat
      for (const t of SEASONAL_TASKS) {
        if (!selected.has(t.key)) continue
        const base = {
          asset_id:           assetId,
          title:              t.title,
          description:        t.description,
          notes:              t.notes || null,
          priority:           t.priority,
          repeat_after_years: 1,
          interval_days:      null,
          last_done:          null,
        }
        rows.push({ ...base, fixed_due_date: springDate })
        rows.push({ ...base, fixed_due_date: fallDate })
      }

      // Periodic: one row with repeat every N years
      for (const t of PERIODIC_TASKS) {
        if (!selected.has(t.key)) continue
        const today = new Date()
        const due = new Date(today.getFullYear() + t.repeatYears, today.getMonth(), today.getDate())
        rows.push({
          asset_id:           assetId,
          title:              t.title,
          description:        t.description,
          notes:              t.notes || null,
          priority:           t.priority,
          repeat_after_years: t.repeatYears,
          fixed_due_date:     due.toISOString().slice(0, 10),
          interval_days:      null,
          last_done:          null,
        })
      }

      if (rows.length === 0) { onClose?.(); return }

      const { error: err } = await supabase.from('tasks').insert(rows)
      if (err) throw err
      onSaved?.()
      onClose?.()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const total = selected.size
  // Count actual rows that will be inserted (seasonal = 2 rows each)
  const rowCount = SEASONAL_TASKS.filter(t => selected.has(t.key)).length * 2
                 + PERIODIC_TASKS.filter(t => selected.has(t.key)).length

  return (
    <Modal title="Vedlikeholdskalender for tilhenger/campingvogn" onClose={onClose} size="lg">
      <div className="htp-intro">
        <p>Velg oppgavene du vil legge til. Sesongoppgaver opprettes som to faste datoer — én vår og én høst — og gjentas årlig.</p>
        <button type="button" className="htp-select-all" onClick={selectAll}>Velg alle</button>
      </div>

      {/* Date pickers */}
      <div className="htp-dates">
        <div className="htp-date-field">
          <label>Vår-dato</label>
          <input
            type="date"
            value={springDate}
            onChange={e => setSpringDate(e.target.value)}
            className="input"
            style={{ padding: '8px 12px', minHeight: 'unset', fontSize: 'var(--font-size-sm)' }}
          />
          <span className="htp-date-hint">Dato for alle vår-oppgaver</span>
        </div>
        <div className="htp-date-field">
          <label>Høst-dato</label>
          <input
            type="date"
            value={fallDate}
            onChange={e => setFallDate(e.target.value)}
            className="input"
            style={{ padding: '8px 12px', minHeight: 'unset', fontSize: 'var(--font-size-sm)' }}
          />
          <span className="htp-date-hint">Dato for alle høst-oppgaver</span>
        </div>
      </div>

      <div className="htp-months">
        {/* Seasonal */}
        <div className="htp-month">
          <div className="htp-month-label htp-month-label--section">
            Vår og høst
            <span className="htp-month-freq">2x/år · gjentas årlig</span>
          </div>
          <ul className="htp-tasks">
            {SEASONAL_TASKS.map(task => (
              <li key={task.key}>
                <label className={`htp-task${selected.has(task.key) ? ' htp-task--on' : ''}`}>
                  <input
                    type="checkbox"
                    checked={selected.has(task.key)}
                    onChange={() => toggle(task.key)}
                  />
                  <span className="htp-task-title">{task.title}</span>
                  <span className="htp-task-freq">2x/år</span>
                </label>
              </li>
            ))}
          </ul>
        </div>

        {/* Periodic */}
        <div className="htp-month">
          <div className="htp-month-label htp-month-label--section">
            Periodevise oppgaver
          </div>
          <ul className="htp-tasks">
            {PERIODIC_TASKS.map(task => (
              <li key={task.key}>
                <label className={`htp-task${selected.has(task.key) ? ' htp-task--on' : ''}`}>
                  <input
                    type="checkbox"
                    checked={selected.has(task.key)}
                    onChange={() => toggle(task.key)}
                  />
                  <span className="htp-task-title">{task.title}</span>
                  <span className="htp-task-freq">1x/{task.repeatYears} år</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {error && <p className="htp-error">{error}</p>}

      <div className="htp-footer">
        <span className="muted">
          {total === 0
            ? 'Ingen valgt'
            : `${total} oppgave${total === 1 ? '' : 'r'} valgt → ${rowCount} rader`}
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
