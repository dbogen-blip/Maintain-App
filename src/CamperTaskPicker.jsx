import { useState } from 'react'
import { supabase } from './supabaseClient'
import Modal from './components/Modal'
import Button from './components/Button'
import './HouseTaskPicker.css'

// ── Sesongoppgaver (vår og høst) — samme som for tilhenger ──────────────────
const SEASONAL_TASKS = [
  {
    key: 'c_lys_el',
    title: 'Kontroller lys og elektrisk',
    description: `Sjekk at alle lys fungerer:\n• bremselys\n• blinklys\n• parklys\n• ryggelys\n\nKoble til vognen og gå rundt mens lysene testes. Kontroller også kontakten for rust, fukt eller løse ledninger. Bruk kontaktspray ved dårlig kontakt.`,
    notes: 'Kontaktspray',
    priority: 2,
  },
  {
    key: 'c_dekk_hjul',
    title: 'Sjekk dekk og hjul',
    description: `Kontroller lufttrykk og se etter:\n• sprekker\n• tørrråte\n• skjev slitasje\n\nEtterstram hjulmutre og kjenn etter slark eller ulyder i hjullager når hjulet roteres. Dekk som står lenge kan bli dårlige selv med godt mønster.`,
    notes: 'Lufttrykkmåler, momentnøkkel for hjulmutre',
    priority: 2,
  },
  {
    key: 'c_kobling',
    title: 'Vedlikehold kobling og bevegelige deler',
    description: `Kontroller kulekobling og sikkerhetswire for skader eller rust. Smør:\n• kobling\n• støttehjul\n• hengsler\n• låser\n\nBruk egnet fett eller smørespray for å hindre rust og treg mekanikk. Hvis det er smørenippel på drag, pumpes fett inn.`,
    notes: 'Lithiumfett, smørespray, fettsprøyte',
    priority: 2,
  },
  {
    key: 'c_bremser',
    title: 'Kontroller bremser og understell',
    description: `På bremsede vogner:\n• test håndbrekk\n• sjekk påløpsbrems\n• se etter rust eller tregheter\n\nUndersøk også ramme, drag og underside for rust, sprekker eller løse bolter. Vask gjerne undersiden etter vinterbruk.`,
    notes: 'Verktøy for bremsejustering (om aktuelt)',
    priority: 1,
  },
  {
    key: 'c_vask_rust',
    title: 'Vask og rustbeskytt vognen',
    description: `Vask vognen grundig minst én gang i året, spesielt:\n• underside\n• hjulbuer\n• rundt bolter og sveiser\n\nFjern salt og skitt, og behandle utsatte områder med rustbeskyttelse. Kontroller samtidig gulv og treverk for fukt eller råte.`,
    notes: 'Rustbeskyttelse (f.eks. Dinitrol), høytrykkspyler',
    priority: 2,
  },
]

// ── Høstvedlikehold — vinterklargjøring (kun høst-dato) ─────────────────────
const WINTER_TASKS = [
  {
    key: 'w_vann',
    title: 'Tøm hele vannsystemet',
    description: `Vann som fryser kan skade rør, blandebatterier, vannpumpe og varmtvannsbereder.\n\nSlik gjør du:\n• Slå av vannpumpen\n• Åpne alle kraner i midtstilling mellom varmt og kaldt\n• Åpne alle dreneringspunkter: ferskvannstank, varmtvannsbereder, vannslanger\n• La vannet renne helt ut\n• Kjør vannpumpen noen sekunder for å blåse ut resterende vann\n• Tøm også filteret på trykkpumpen`,
    notes: 'Oppsamlingsbøtte, håndkle/kluter, eventuelt trykkluft/blåsepistol, verktøy for filter/dreneringspunkter',
    priority: 1,
  },
  {
    key: 'w_sluk',
    title: 'Beskytt sluk, toalett og gråvann',
    description: `Vannlåser og tanker holder ofte igjen vann som kan fryse.\n\nSlik gjør du:\n• Tøm og rengjør toalettkassetten\n• La gråvannstanken stå åpen mest mulig gjennom vinteren\n• Hell litt frostvæske i sluk, vannlåser og toalett ved behov\n• La toalettspjeld stå litt åpent`,
    notes: 'Frostvæske til camping/båt, toalettrens, hansker, kontaktspray/silikonspray til pakninger',
    priority: 1,
  },
  {
    key: 'w_kraner',
    title: 'Unngå frostskader på kraner og blandebatteri',
    description: `Blandebatterier er spesielt utsatt for frostspreng.\n\nSlik gjør du:\n• La alle kraner stå åpne etter tømming\n• Ikke lukk systemet før vognen er varm igjen\n• Ved vinterbruk: vent til hele vognen er oppvarmet før vannsystemet startes`,
    notes: 'Varmevifte, eventuelt varmluftspistol ved tilfrosne deler, reservepakninger/blandebatteri ved eldre vogn',
    priority: 1,
  },
  {
    key: 'w_kondens',
    title: 'Forebygg kondens og fukt',
    description: `Fukt kan føre til mugg, dårlig lukt og skader på interiør.\n\nSlik gjør du:\n• Åpne skap og dører litt\n• Sett puter og madrasser på høykant\n• Fjern tekstiler som holder på fukt\n• Sørg for lufting gjennom vinteren\n• Bruk fuktsluker i vognen`,
    notes: 'Fuktsluker/fuktabsorber, mikrofiberkluter, eventuelt liten avfukter',
    priority: 2,
  },
  {
    key: 'w_vinter',
    title: 'Klargjør for vinterbruk og nødsituasjoner',
    description: `Ved bruk om vinteren må systemet tåle kulde og kunne tines opp.\n\nSlik gjør du:\n• Isoler tanker og vannslanger ved vintercamping\n• Vurder varmeelementer på tanker\n• Ha alltid tineutstyr tilgjengelig\n• Kontroller batteri og strøm jevnlig`,
    notes: 'Varmevifte, varmluftspistol, isolasjon til slanger/tanker, varmeelement for tanker, batterilader/vedlikeholdslader',
    priority: 2,
  },
]

// ── Periodevise oppgaver ─────────────────────────────────────────────────────
const PERIODIC_TASKS = [
  {
    key: 'c_bremseservice',
    title: 'Bremseservice på verksted',
    description: 'Komplett bremseservice utført av autorisert verksted. Inkluderer gjennomgang av bremsetrommer/skiver, bremsebånd/klosser og påløpsbrems.',
    notes: '',
    priority: 1,
    repeatYears: 5,
  },
]

function nextDate(month, day) {
  const today = new Date()
  const y = today.getFullYear()
  const d = new Date(y, month - 1, day)
  if (d <= today) d.setFullYear(y + 1)
  return d.toISOString().slice(0, 10)
}

export default function CamperTaskPicker({ assetId, onClose, onSaved }) {
  const allKeys = [
    ...SEASONAL_TASKS.map(t => t.key),
    ...WINTER_TASKS.map(t => t.key),
    ...PERIODIC_TASKS.map(t => t.key),
  ]
  const [selected, setSelected]     = useState(() => new Set(allKeys))
  const [springDate, setSpringDate] = useState(() => nextDate(4, 15))   // 15. april
  const [fallDate,   setFallDate]   = useState(() => nextDate(10, 1))   // 1. oktober
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState(null)

  function toggle(key) {
    setSelected(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n })
  }

  function toggleSection(tasks) {
    const keys = tasks.map(t => t.key)
    const allOn = keys.every(k => selected.has(k))
    setSelected(s => {
      const n = new Set(s)
      keys.forEach(k => allOn ? n.delete(k) : n.add(k))
      return n
    })
  }

  function selectAll() { setSelected(new Set(allKeys)) }

  async function handleAdd() {
    if (!springDate || !fallDate) { setError('Velg begge datoer'); return }
    setSaving(true); setError(null)
    try {
      const rows = []

      // Seasonal: two fixed-date rows per task (spring + fall)
      for (const t of SEASONAL_TASKS) {
        if (!selected.has(t.key)) continue
        const base = {
          asset_id: assetId, title: t.title, description: t.description,
          notes: t.notes || null, priority: t.priority,
          repeat_after_years: 1, interval_days: null, last_done: null,
        }
        rows.push({ ...base, fixed_due_date: springDate })
        rows.push({ ...base, fixed_due_date: fallDate })
      }

      // Winter prep: fall date only
      for (const t of WINTER_TASKS) {
        if (!selected.has(t.key)) continue
        rows.push({
          asset_id: assetId, title: t.title, description: t.description,
          notes: t.notes || null, priority: t.priority,
          repeat_after_years: 1, fixed_due_date: fallDate,
          interval_days: null, last_done: null,
        })
      }

      // Periodic
      for (const t of PERIODIC_TASKS) {
        if (!selected.has(t.key)) continue
        const today = new Date()
        const due = new Date(today.getFullYear() + t.repeatYears, today.getMonth(), today.getDate())
        rows.push({
          asset_id: assetId, title: t.title, description: t.description,
          notes: t.notes || null, priority: t.priority,
          repeat_after_years: t.repeatYears,
          fixed_due_date: due.toISOString().slice(0, 10),
          interval_days: null, last_done: null,
        })
      }

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
  const rowCount =
    SEASONAL_TASKS.filter(t => selected.has(t.key)).length * 2 +
    WINTER_TASKS.filter(t => selected.has(t.key)).length +
    PERIODIC_TASKS.filter(t => selected.has(t.key)).length

  const seasonalAllOn = SEASONAL_TASKS.every(t => selected.has(t.key))
  const seasonalSomeOn = SEASONAL_TASKS.some(t => selected.has(t.key))
  const winterAllOn = WINTER_TASKS.every(t => selected.has(t.key))
  const winterSomeOn = WINTER_TASKS.some(t => selected.has(t.key))

  return (
    <Modal title="Vedlikeholdskalender for campingvogn / bobil" onClose={onClose} size="lg">
      <div className="htp-intro">
        <p>Sesongoppgaver opprettes som to faste datoer (vår + høst). Vinterklargjøring opprettes kun på høst-datoen. Alle gjentas årlig.</p>
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
          <span className="htp-date-hint">Dato for høst- og vinteroppgaver</span>
        </div>
      </div>

      <div className="htp-months">
        {/* Seasonal vår + høst */}
        <div className="htp-month">
          <button
            type="button"
            className={`htp-month-label${seasonalAllOn ? ' htp-month-label--on' : seasonalSomeOn ? ' htp-month-label--partial' : ''}`}
            onClick={() => toggleSection(SEASONAL_TASKS)}
            title={seasonalAllOn ? 'Fjern alle' : 'Velg alle'}
          >
            <span className="htp-month-check">{seasonalAllOn ? '✓' : seasonalSomeOn ? '–' : ''}</span>
            Vår og høst
            <span className="htp-month-freq">2x/år · gjentas årlig</span>
          </button>
          <ul className="htp-tasks">
            {SEASONAL_TASKS.map(task => (
              <li key={task.key}>
                <label className={`htp-task${selected.has(task.key) ? ' htp-task--on' : ''}`}>
                  <input type="checkbox" checked={selected.has(task.key)} onChange={() => toggle(task.key)} />
                  <span className="htp-task-title">{task.title}</span>
                  <span className="htp-task-freq">2x/år</span>
                </label>
              </li>
            ))}
          </ul>
        </div>

        {/* Winter prep — fall only */}
        <div className="htp-month">
          <button
            type="button"
            className={`htp-month-label${winterAllOn ? ' htp-month-label--on' : winterSomeOn ? ' htp-month-label--partial' : ''}`}
            onClick={() => toggleSection(WINTER_TASKS)}
            title={winterAllOn ? 'Fjern alle' : 'Velg alle'}
          >
            <span className="htp-month-check">{winterAllOn ? '✓' : winterSomeOn ? '–' : ''}</span>
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

        {/* Periodic */}
        <div className="htp-month">
          <div className="htp-month-label htp-month-label--section">
            Periodevise oppgaver
          </div>
          <ul className="htp-tasks">
            {PERIODIC_TASKS.map(task => (
              <li key={task.key}>
                <label className={`htp-task${selected.has(task.key) ? ' htp-task--on' : ''}`}>
                  <input type="checkbox" checked={selected.has(task.key)} onChange={() => toggle(task.key)} />
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
          {total === 0 ? 'Ingen valgt' : `${total} oppgave${total === 1 ? '' : 'r'} valgt → ${rowCount} rader`}
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
