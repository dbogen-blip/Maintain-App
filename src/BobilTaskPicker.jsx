import { useState } from 'react'
import { supabase } from './supabaseClient'
import Modal from './components/Modal'
import Button from './components/Button'
import './HouseTaskPicker.css'

const WINTER_TASKS = [
  {
    key: 'b_vann',
    title: 'Tøm hele vannsystemet',
    description: `Vann som fryser kan skade rør, blandebatterier, vannpumpe og varmtvannsbereder.\n\nSlik gjør du:\n• Slå av vannpumpen\n• Åpne alle kraner i midtstilling mellom varmt og kaldt\n• Åpne alle dreneringspunkter: ferskvannstank, varmtvannsbereder, vannslanger\n• La vannet renne helt ut\n• Kjør vannpumpen noen sekunder for å blåse ut resterende vann\n• Tøm også filteret på trykkpumpen`,
    notes: 'Oppsamlingsbøtte, håndkle/kluter, eventuelt trykkluft/blåsepistol, verktøy for filter/dreneringspunkter',
    priority: 1,
  },
  {
    key: 'b_sluk',
    title: 'Beskytt sluk, toalett og gråvann',
    description: `Vannlåser og tanker holder ofte igjen vann som kan fryse.\n\nSlik gjør du:\n• Tøm og rengjør toalettkassetten\n• La gråvannstanken stå åpen mest mulig gjennom vinteren\n• Hell litt frostvæske i sluk, vannlåser og toalett ved behov\n• La toalettspjeld stå litt åpent`,
    notes: 'Frostvæske til camping/båt, toalettrens, hansker, kontaktspray/silikonspray til pakninger',
    priority: 1,
  },
  {
    key: 'b_kraner',
    title: 'Unngå frostskader på kraner og blandebatteri',
    description: `Blandebatterier er spesielt utsatt for frostspreng.\n\nSlik gjør du:\n• La alle kraner stå åpne etter tømming\n• Ikke lukk systemet før vognen er varm igjen\n• Ved vinterbruk: vent til hele vognen er oppvarmet før vannsystemet startes`,
    notes: 'Varmevifte, eventuelt varmluftspistol ved tilfrosne deler, reservepakninger/blandebatteri ved eldre vogn',
    priority: 1,
  },
  {
    key: 'b_kondens',
    title: 'Forebygg kondens og fukt',
    description: `Fukt kan føre til mugg, dårlig lukt og skader på interiør.\n\nSlik gjør du:\n• Åpne skap og dører litt\n• Sett puter og madrasser på høykant\n• Fjern tekstiler som holder på fukt\n• Sørg for lufting gjennom vinteren\n• Bruk fuktsluker i vognen`,
    notes: 'Fuktsluker/fuktabsorber, mikrofiberkluter, eventuelt liten avfukter',
    priority: 2,
  },
  {
    key: 'b_vinter',
    title: 'Klargjør for vinterbruk og nødsituasjoner',
    description: `Ved bruk om vinteren må systemet tåle kulde og kunne tines opp.\n\nSlik gjør du:\n• Isoler tanker og vannslanger ved vintercamping\n• Vurder varmeelementer på tanker\n• Ha alltid tineutstyr tilgjengelig\n• Kontroller batteri og strøm jevnlig`,
    notes: 'Varmevifte, varmluftspistol, isolasjon til slanger/tanker, varmeelement for tanker, batterilader/vedlikeholdslader',
    priority: 2,
  },
]

function nextDate(month, day) {
  const today = new Date()
  const y = today.getFullYear()
  const d = new Date(y, month - 1, day)
  if (d <= today) d.setFullYear(y + 1)
  return d.toISOString().slice(0, 10)
}

export default function BobilTaskPicker({ assetId, onClose, onSaved }) {
  const [selected, setSelected] = useState(() => new Set(WINTER_TASKS.map(t => t.key)))
  const [fallDate, setFallDate] = useState(() => nextDate(10, 1))
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState(null)

  function toggle(key) {
    setSelected(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n })
  }

  const allOn  = WINTER_TASKS.every(t => selected.has(t.key))
  const someOn = WINTER_TASKS.some(t => selected.has(t.key))

  async function handleAdd() {
    if (!fallDate) { setError('Velg høst-dato'); return }
    setSaving(true); setError(null)
    try {
      const rows = WINTER_TASKS
        .filter(t => selected.has(t.key))
        .map(t => ({
          asset_id:           assetId,
          title:              t.title,
          description:        t.description,
          notes:              t.notes || null,
          priority:           t.priority,
          repeat_after_years: 1,
          fixed_due_date:     fallDate,
          interval_days:      null,
          last_done:          null,
        }))

      if (rows.length === 0) { onClose?.(); return }
      const { error: err } = await supabase.from('tasks').insert(rows)
      if (err) throw err
      onSaved?.(); onClose?.()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const total = selected.size

  return (
    <Modal title="Vinterklargjøring for bobil" onClose={onClose} size="lg">
      <div className="htp-intro">
        <p>Alle oppgaver opprettes med én fast høst-dato og gjentas årlig.</p>
        <button type="button" className="htp-select-all" onClick={() => setSelected(new Set(WINTER_TASKS.map(t => t.key)))}>
          Velg alle
        </button>
      </div>

      <div className="htp-dates" style={{ gridTemplateColumns: '1fr' }}>
        <div className="htp-date-field">
          <label>Høst-dato</label>
          <input
            type="date"
            value={fallDate}
            onChange={e => setFallDate(e.target.value)}
            className="input"
            style={{ padding: '8px 12px', minHeight: 'unset', fontSize: 'var(--font-size-sm)' }}
          />
          <span className="htp-date-hint">Alle oppgaver legges på denne datoen</span>
        </div>
      </div>

      <div className="htp-months">
        <div className="htp-month">
          <button
            type="button"
            className={`htp-month-label${allOn ? ' htp-month-label--on' : someOn ? ' htp-month-label--partial' : ''}`}
            onClick={() => {
              const keys = WINTER_TASKS.map(t => t.key)
              const on = keys.every(k => selected.has(k))
              setSelected(s => { const n = new Set(s); keys.forEach(k => on ? n.delete(k) : n.add(k)); return n })
            }}
          >
            <span className="htp-month-check">{allOn ? '✓' : someOn ? '–' : ''}</span>
            Vinterklargjøring
            <span className="htp-month-freq">1x/år · kun høst</span>
          </button>
          <ul className="htp-tasks">
            {WINTER_TASKS.map(task => (
              <li key={task.key}>
                <label className={`htp-task${selected.has(task.key) ? ' htp-task--on' : ''}`}>
                  <input type="checkbox" checked={selected.has(task.key)} onChange={() => toggle(task.key)} />
                  <span className="htp-task-title">{task.title}</span>
                  <span className="htp-task-freq">1x/år</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
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
