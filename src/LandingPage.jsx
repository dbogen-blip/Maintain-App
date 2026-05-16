import { useState } from 'react'
import { categoryImgProps } from './categoryImages'
import './LandingPage.css'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

// ── Demo asset data ────────────────────────────────────────────────────────
const DEMO_ASSETS = [
  {
    id: 'bil',
    name: 'Toyota RAV4',
    category: 'Bil',
    regnr: 'AB12345',
    vehicleMockResult: {
      name: 'TOYOTA RAV4',
      category: 'Bil',
      description: 'Merke: TOYOTA\nModell: RAV4\nÅrsmodell: 2019\nDrivstoff: Bensin\nFarge: Hvit\nEgenvekt: 1560 kg\nTilhengervekt (med brems): 1800 kg\nTilhengervekt (uten brems): 750 kg',
      eu_date: '2025-09-15',
    },
    tasks: [
      { id: 1, title: 'EU-kontroll',                       days: -5,  priority: 1, desc: 'Periodisk kjøretøykontroll. Dato hentet automatisk fra Statens vegvesen ved opprettelse.' },
      { id: 2, title: 'Skifte motorolje og filter',         days: 45,  priority: 1, desc: 'Anbefalt hvert 15 000 km eller 1 år. Forhindrer slitasje og motorskade.' },
      { id: 3, title: 'Dekkbytte sommer/vinter',           days: 18,  priority: 2, desc: 'Skifte til vinterdekk innen 1. november. Viktig for sikkerhet og lovlig kjøring.' },
      { id: 4, title: 'Skifte luftfilter',                 days: 120, priority: 2, desc: 'Hvert 2. år eller 30 000 km. Et tilstoppet filter gir dårlig ytelse.' },
      { id: 5, title: 'Kontroll bremser og bremsevæske',   days: 180, priority: 1, desc: 'Bremsevæske absorberer fukt og bør skiftes hvert 2. år.' },
    ],
  },
  {
    id: 'hus',
    name: 'Enebolig Stavanger',
    category: 'Hus',
    tasks: [
      { id: 1, title: 'Rens takrenner',                    days: 5,   priority: 1, desc: 'Hindrer vannskader på fasade og fundament. Gjøres hver høst etter at løvene har falt.' },
      { id: 2, title: 'Feie pipeløp',                      days: 30,  priority: 1, desc: 'Lovpålagt service av skorstein én gang i året. Forhindrer pipebrann.' },
      { id: 3, title: 'Bytte batteri i røykvarslere',      days: 45,  priority: 1, desc: 'Byttes én gang i året. Test alle varslere jevnlig.' },
      { id: 4, title: 'Oljebehandle terrasse',             days: 90,  priority: 2, desc: 'Beskytter treverk mot fukt og råte. Gjøres hvert 1–2 år.' },
      { id: 5, title: 'Service varmepumpe',                days: 180, priority: 2, desc: 'Rengjøring av filter og kontroll av kjølemiddel. Hvert 2. år.' },
      { id: 6, title: 'Kontroller drenering rundt hus',    days: 365, priority: 1, desc: 'Sjekk at dreneringsrør og grøfter er frie for blokkering.' },
    ],
  },
  {
    id: 'hytte',
    name: 'Hytte Vrådal',
    category: 'Hytte',
    tasks: [
      { id: 1, title: 'Vedlikehold brygge',                days: -10, priority: 2, desc: 'Oljebehandle brygge og sjekk bolter og fortøyninger. Bør gjøres om høsten.' },
      { id: 2, title: 'Vinterklargjøring',                 days: 21,  priority: 1, desc: 'Tøm vannrør, steng ventiler og sikre mot frost. Gjøres senest i oktober.' },
      { id: 3, title: 'Rens kamin og pipe',                days: 60,  priority: 1, desc: 'Fjern sot og aske. Kontroller pakning i kamindøren.' },
      { id: 4, title: 'Sjekk tak og tetting',              days: 90,  priority: 1, desc: 'Kontroller takstein og tetting rundt vinduer etter vinteren.' },
      { id: 5, title: 'Service diesel aggregat',           days: 120, priority: 1, desc: 'Olje, filter og tennplugg. Start aggregat regelmessig for å unngå at det setter seg.' },
    ],
  },
  {
    id: 'campingvogn',
    name: 'Hobby 490 UL',
    category: 'Campingvogn',
    regnr: 'AB1234',
    vehicleMockResult: {
      name: 'HOBBY 490 UL',
      category: 'Campingvogn',
      description: 'Merke: HOBBY\nModell: 490 UL\nÅrsmodell: 2018\nFarge: Hvit\nEgenvekt: 1250 kg\nNyttelast: 180 kg\nTillatt totalvekt: 1430 kg',
      eu_date: '2026-04-20',
    },
    tasks: [
      { id: 1, title: 'Kontroller lys og elektrisk',       days: 7,   priority: 2, desc: 'Sjekk bremselys, blinklys, parklys og stikkontakten for rust eller løse ledninger.' },
      { id: 2, title: 'Sjekk dekk og hjul',                days: 7,   priority: 2, desc: 'Lufttrykk, mønster, tørrråte og etterstram hjulmutre.' },
      { id: 3, title: 'Tøm hele vannsystemet',             days: 21,  priority: 1, desc: 'Vinterklargjøring: tøm pumpe, tank og varmtvannsbereder for å unngå frost.' },
      { id: 4, title: 'Beskytt sluk og gråvann',           days: 21,  priority: 1, desc: 'Frostvæske i vannlåser og toalett. La toalettspjeld stå åpent.' },
      { id: 5, title: 'Forebygg kondens og fukt',          days: 21,  priority: 2, desc: 'Åpne skap, sett madrasser på høykant og bruk fuktsluker.' },
      { id: 6, title: 'Bremseservice på verksted',         days: 365 * 4, priority: 1, desc: 'Komplett gjennomgang av bremsetrommer og påløpsbrems. Hvert 5. år.' },
    ],
  },
  {
    id: 'sykkel',
    name: 'Trek Marlin 5',
    category: 'Sykkel',
    tasks: [
      { id: 1, title: 'Kjede og girjustering',             days: 14,  priority: 1, desc: 'Rengjør og smør kjede. Juster girskifter for presis giring.' },
      { id: 2, title: 'Sjekk lufttrykk og dekk',           days: 14,  priority: 2, desc: 'Pumpe til riktig trykk og se etter kutt eller slitasje.' },
      { id: 3, title: 'Sjekk bremser og bremseklosser',    days: 30,  priority: 1, desc: 'Kontroller slitasje og justering. Skift klosser ved behov.' },
      { id: 4, title: 'Vask og helgjennomgang',            days: 60,  priority: 2, desc: 'Komplett rengjøring og kontroll av alle bolter og lager.' },
      { id: 5, title: 'Service nav og pedaler',            days: 180, priority: 2, desc: 'Smøre nav, sjekke pedaler og styre for losshet.' },
    ],
  },
  {
    id: 'hage',
    name: 'Hage hjemme',
    category: 'Hage',
    tasks: [
      { id: 1, title: 'Service gressklipper',              days: -3,  priority: 1, desc: 'Rengjøring, olje og slip kniv. Gjøres hver sesong.' },
      { id: 2, title: 'Gjødsle plener',                    days: 14,  priority: 2, desc: 'Høstgjødsling med kalium og fosfor for god vinterherdighet.' },
      { id: 3, title: 'Klipp og form hekk',                days: 30,  priority: 2, desc: 'Siste klipp av sesongen etter 1. september.' },
      { id: 4, title: 'Vinterklargjøre hagemøbler',        days: 45,  priority: 2, desc: 'Rens, tørk og lagre innendørs eller dekk til.' },
      { id: 5, title: 'Service motorsag',                  days: 90,  priority: 1, desc: 'Kjede, bar, luftfilter og tennplugg.' },
      { id: 6, title: 'Plante og fornye stauder',          days: 150, priority: 2, desc: 'Del opp og flytt stauder som er blitt for store. Gjøres om høsten.' },
    ],
  },
]

// ── Helper: classify days → group and badge ───────────────────────────────
function taskGroup(days) {
  if (days < 0)   return 'overdue'
  if (days <= 30) return 'soon'
  return 'upcoming'
}
function taskBadge(days) {
  if (days < 0)  return { label: `Forfalt ${-days}d`,     cls: 'lp-tbadge--danger'  }
  if (days === 0) return { label: 'I dag',                 cls: 'lp-tbadge--danger'  }
  if (days <= 7)  return { label: `Om ${days} dag${days===1?'':'er'}`, cls: 'lp-tbadge--warning' }
  if (days <= 30) return { label: `Om ${days} dager`,     cls: 'lp-tbadge--warning' }
  if (days < 365) return { label: `Om ${days} dager`,     cls: 'lp-tbadge--neutral' }
  const yrs = Math.round(days / 365)
  return { label: `Om ${yrs} år`,                         cls: 'lp-tbadge--neutral' }
}
function assetStatus(tasks) {
  const overdue = tasks.filter(t => t.days < 0)
  const soon    = tasks.filter(t => t.days >= 0 && t.days <= 14)
  if (overdue.length > 0) return { level: 'overdue',  label: 'Forfalt' }
  if (soon.length > 0)    return { level: 'warning',  label: 'Snart'   }
  return                         { level: 'ok',        label: 'Alt OK'  }
}
function nextTask(tasks) {
  const active = [...tasks].sort((a, b) => a.days - b.days)
  return active[0] ?? null
}

// ── Reg.nr.-oppslagskomponent (fungerende API-kall) ───────────────────────
function RegnrDemo({ initialRegnr = '', mockResult = null }) {
  const [regnr, setRegnr]     = useState(initialRegnr)
  const [result, setResult]   = useState(mockResult)   // pre-filled for demo
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [tried, setTried]     = useState(!!mockResult)

  async function lookup() {
    const nr = regnr.trim().toUpperCase().replace(/\s/g, '')
    if (!nr) return
    setLoading(true); setError(null); setResult(null); setTried(true)
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/lookup-vehicle?regnr=${encodeURIComponent(nr)}`)
      const data = await res.json()
      if (data.error) { setError('Kjøretøy ikke funnet. Prøv et annet reg.nr.'); return }
      setResult(data)
    } catch {
      setError('Kunne ikke nå tjenesten. Prøv igjen.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="lp-regnr-demo">
      <div className="lp-regnr-demo-header">
        <div className="lp-regnr-demo-icon">🔍</div>
        <div>
          <div className="lp-regnr-demo-title">Søk opp kjøretøy med reg.nr.</div>
          <div className="lp-regnr-demo-sub">Data hentes automatisk fra Statens vegvesen</div>
        </div>
      </div>
      <div className="lp-regnr-demo-row">
        <input
          className="lp-regnr-input"
          value={regnr}
          onChange={e => setRegnr(e.target.value.toUpperCase())}
          placeholder="AB12345"
          maxLength={8}
          onKeyDown={e => e.key === 'Enter' && lookup()}
        />
        <button className="lp-regnr-btn" onClick={lookup} disabled={loading}>
          {loading ? 'Henter …' : 'Hent data'}
        </button>
      </div>
      {error && <div className="lp-regnr-error">{error}</div>}
      {result && (
        <div className="lp-regnr-result">
          <div className="lp-regnr-result-name">{result.name}</div>
          <div className="lp-regnr-result-desc">{result.description}</div>
          {result.eu_date && (
            <div className="lp-regnr-eu">
              <span className="lp-regnr-eu-icon">📅</span>
              <span><strong>EU-kontroll</strong> lagt til automatisk · Forfaller {new Date(result.eu_date).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
          )}
          <div className="lp-regnr-tag">{result.category}</div>
        </div>
      )}
      {!tried && (
        <div className="lp-regnr-hint">Prøv med ditt eget reg.nr. – eller bruk eksempelet over</div>
      )}
    </div>
  )
}

// ── Demo detail modal ─────────────────────────────────────────────────────
function DemoDetailModal({ asset, onClose }) {
  if (!asset) return null

  const status  = assetStatus(asset.tasks)
  const next    = nextTask(asset.tasks)
  const overdue = asset.tasks.filter(t => t.days < 0)
  const soon    = asset.tasks.filter(t => t.days >= 0 && t.days <= 30)
  const upcoming = asset.tasks.filter(t => t.days > 30)
  const isVehicle = ['Bil', 'MC/ATV', 'Campingvogn', 'Bobil', 'Tilhenger'].includes(asset.category)

  const nextText = !next ? null
    : next.days < 0  ? `Forfalt for ${-next.days} dag${-next.days===1?'':'er'} siden`
    : next.days === 0 ? 'I dag'
    : `Om ${next.days} dag${next.days===1?'':'er'}`

  return (
    <div className="lp-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="lp-modal">
        {/* Header */}
        <div className="lp-modal-header">
          <div className="lp-demo-badge">Demo · Les-modus</div>
          <button className="lp-modal-close" onClick={onClose} aria-label="Lukk">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="lp-modal-body">
          {/* Hero */}
          <div className="lp-modal-hero">
            <div className="lp-modal-hero-img">
              <img {...categoryImgProps(asset.category)} alt={asset.category} />
            </div>
            <div className="lp-modal-hero-info">
              <div className="lp-modal-hero-category">{asset.category}</div>
              <h2 className="lp-modal-hero-name">{asset.name}</h2>
              {asset.regnr && (
                <div className="lp-modal-regnr">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                  {asset.regnr}
                </div>
              )}
              <div className="lp-modal-tiles">
                <div className={`lp-modal-tile lp-modal-tile--${status.level}`}>
                  <div className="lp-modal-tile-val">{status.label}</div>
                  <div className="lp-modal-tile-lbl">Status</div>
                </div>
                <div className="lp-modal-tile">
                  <div className="lp-modal-tile-val">{asset.tasks.length}</div>
                  <div className="lp-modal-tile-lbl">Oppgaver</div>
                </div>
                <div className="lp-modal-tile">
                  <div className="lp-modal-tile-val">{nextText ?? '—'}</div>
                  <div className="lp-modal-tile-lbl">Neste forfall</div>
                </div>
              </div>
            </div>
          </div>

          {/* Reg.nr.-demo for vehicles */}
          {isVehicle && asset.regnr && (
            <RegnrDemo initialRegnr={asset.regnr} mockResult={asset.vehicleMockResult ?? null} />
          )}

          {/* Task groups */}
          <div className="lp-modal-tasks">
            {overdue.length > 0 && (
              <TaskGroup label="Forfalt" tasks={overdue} variant="danger" />
            )}
            {soon.length > 0 && (
              <TaskGroup label="Snart" tasks={soon} variant="warning" />
            )}
            {upcoming.length > 0 && (
              <TaskGroup label="Planlagt" tasks={upcoming} variant="neutral" />
            )}
          </div>

          {/* CTA */}
          <div className="lp-modal-cta">
            <p>Dette er en eksempelvisning. Logg inn for å legge til dine egne eiendeler og vedlikeholdsplaner.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function TaskGroup({ label, tasks, variant }) {
  const variantCls = { danger: 'lp-tgroup--danger', warning: 'lp-tgroup--warning', neutral: '' }[variant] ?? ''
  return (
    <div className={`lp-tgroup ${variantCls}`}>
      <div className="lp-tgroup-header">{label}</div>
      {tasks.map(t => {
        const badge = taskBadge(t.days)
        return (
          <div className="lp-trow" key={t.id}>
            <div className="lp-trow-left">
              <div className="lp-trow-title">{t.title}</div>
              <div className="lp-trow-desc">{t.desc}</div>
            </div>
            <span className={`lp-tbadge ${badge.cls}`}>{badge.label}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Demo asset card (identical look to real app) ──────────────────────────
function DemoAssetCard({ asset, onClick }) {
  const s    = assetStatus(asset.tasks)
  const next = nextTask(asset.tasks)
  const active = asset.tasks.length
  const done   = 0

  const nextWhen = !next ? null
    : next.days < 0  ? `forfalt`
    : next.days === 0 ? 'i dag'
    : `om ${next.days} dag${next.days===1?'':'er'}`

  return (
    <div className="asset-card lp-asset-card" role="button" tabIndex={0} onClick={onClick} onKeyDown={e => e.key === 'Enter' && onClick()}>
      {/* Top: thumbnail + name */}
      <div className="ac-top">
        <div className="ac-thumb">
          <img {...categoryImgProps(asset.category)} alt={asset.category} />
        </div>
        <div className="ac-info">
          <h3 className="ac-name">{asset.name}</h3>
          <span className="ac-category">{asset.category}</span>
        </div>
      </div>

      {/* Middle: next task + status */}
      <div className="ac-middle">
        <div className="ac-next">
          <span className="ac-label">Neste oppgave</span>
          {next ? (
            <div className="ac-next-task">
              <div className="ac-next-title-row">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span className="ac-next-title">{next.title}</span>
              </div>
              <span className={`ac-next-when${next.days <= 0 ? ' ac-next-overdue' : ''}`}>{nextWhen}</span>
            </div>
          ) : (
            <div className="ac-next-empty">Ingen planlagte</div>
          )}
        </div>
        <div className="ac-status-col">
          <span className="ac-label">Status</span>
          <span className={`ac-status-pill ac-status-${s.level}`}>
            <span className="ac-status-dot" />
            {s.label}
          </span>
        </div>
      </div>

      {/* Stats strip */}
      <div className="ac-stats">
        <div className="ac-stat">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          <strong>{active}</strong>
          <span>oppgaver</span>
        </div>
        <div className="ac-stat">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          <strong>{done}/{active}</strong>
          <span>utført</span>
        </div>
        <div className="ac-stat">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <strong>{next ? (next.days < 0 ? 'Forfalt' : next.days === 0 ? 'I dag' : `${next.days}d`) : '—'}</strong>
          <span>neste forfall</span>
        </div>
      </div>
    </div>
  )
}

// ── Static content ─────────────────────────────────────────────────────────
const CATEGORIES = [
  { emoji: '🏠', name: 'Hus & Leilighet' },
  { emoji: '🚗', name: 'Bil' },
  { emoji: '🏍️', name: 'MC / ATV' },
  { emoji: '⛵', name: 'Båt' },
  { emoji: '🏕️', name: 'Hytte' },
  { emoji: '🌱', name: 'Hage' },
  { emoji: '🚐', name: 'Bobil & Campingvogn' },
  { emoji: '🚜', name: 'Traktor & Maskin' },
  { emoji: '🔧', name: 'Verktøy' },
  { emoji: '🚢', name: 'Tilhenger' },
  { emoji: '🚲', name: 'Sykkel' },
  { emoji: '📦', name: 'Annet' },
]

const STEPS = [
  { num: '1', title: 'Legg til eiendelen din', desc: 'Skriv inn registreringsnummer og appen henter info fra Statens vegvesen automatisk – inkludert EU-kontroll-dato. Eller legg til hus, båt, hytte manuelt.' },
  { num: '2', title: 'Få vedlikeholdsplan automatisk', desc: 'Appen foreslår en komplett vedlikeholdskalender basert på hva du eier. Godkjenn, tilpass – og du er i gang på under 5 minutter.' },
  { num: '3', title: 'Få påminnelser', desc: 'Ingen ting faller gjennom sprekker. Du får beskjed i god tid før frister – enten det er EU-kontroll, motorservice eller vinterklargjøring.' },
  { num: '4', title: 'Unngå dyre overraskelser', desc: 'Regelmessig vedlikehold forhindrer store skader. Logg utført arbeid og ha full historikk tilgjengelig når du trenger det.' },
]

const WHY = [
  { icon: '🔍', bg: '#EFF6FF', title: 'Full oversikt – ett sted',      desc: 'Samle vedlikeholdet for alle tingene dine på ett sted. Bil, båt, hus, hytte – alt i én app.' },
  { icon: '🔔', bg: '#FFF7ED', title: 'Aldri glem en frist',           desc: 'EU-kontroll, motorservice, vinterklargjøring. Appen minner deg i god tid slik at du rekker å planlegge.' },
  { icon: '💸', bg: '#F0FDF4', title: 'Spar store summer',             desc: 'Forsømt vedlikehold er dyrt. En ødelagt impeller, tett takrenne eller slitt kjede koster langt mer å reparere enn å forebygge.' },
  { icon: '📋', bg: '#FDF4FF', title: 'Historikk og dokumentasjon',    desc: 'Logg utført arbeid med dato og kostnad. Nyttig ved salg, forsikringssak eller garantikrav.' },
]

const SAVINGS = [
  { big: '3–5×',   label: 'Dyrere å reparere enn å forebygge motorskade' },
  { big: '5 min',  label: 'Nok til å sette opp full vedlikeholdsplan for bilen din' },
  { big: '100%',   label: 'Gratis å komme i gang – ingen betalingsmur' },
  { big: 'Alt',    label: 'Fra bil og båt til hytte og hage – samlet på ett sted' },
]

// ── WrenchIcon inline (avoids importing Icon component) ───────────────────
function WrenchIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>
  )
}

// ── Main landing page ──────────────────────────────────────────────────────
export default function LandingPage({ onGetStarted, onLogin }) {
  const [activeDemo, setActiveDemo] = useState(null)

  return (
    <div className="lp">
      {/* Nav */}
      <nav className="lp-nav">
        <div className="lp-nav-logo">
          <div className="lp-nav-logo-icon"><WrenchIcon size={18} /></div>
          Maintain
        </div>
        <div className="lp-nav-actions">
          <button className="lp-btn-ghost" onClick={onLogin}>Logg inn</button>
          <button className="lp-btn-primary" onClick={onGetStarted}>Kom i gang gratis</button>
        </div>
      </nav>

      {/* Hero */}
      <section className="lp-hero">
        <div className="lp-hero-badge">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          Gratis å komme i gang
        </div>
        <h1>Unngå dyre skader.<br /><span>Ta vare på tingene dine.</span></h1>
        <p className="lp-hero-sub">
          Maintain gir deg full oversikt over vedlikeholdet for alt du eier –
          bil, båt, hus og hytte. Automatiske påminnelser, enkel loggføring og
          ferdig vedlikeholdsplan. Færre overraskelser, lavere kostnader.
        </p>
        <div className="lp-hero-ctas">
          <button className="lp-btn-primary lp-btn-primary--lg" onClick={onGetStarted}>Kom i gang gratis</button>
          <button className="lp-btn-outline--lg" onClick={onLogin}>Logg inn</button>
        </div>
        <p className="lp-hero-note">Ingen kredittkort. Ingen betalingsmur.</p>
      </section>

      {/* Demo asset cards */}
      <div className="lp-section--bg">
        <div className="lp-section-inner">
          <div className="lp-section-eyebrow">Se hvordan det fungerer</div>
          <h2 className="lp-section-title">Trykk på en eiendel for å se vedlikeholdsplanen</h2>
          <p className="lp-section-sub" style={{ marginBottom: 'var(--space-8)' }}>
            Eksemplene nedenfor viser reelle vedlikeholdsplaner. Klikk for å se detaljer –
            inkludert hvordan reg.nr.-oppslag fungerer for kjøretøy.
          </p>
          <div className="asset-grid lp-demo-grid">
            {DEMO_ASSETS.map(a => (
              <DemoAssetCard key={a.id} asset={a} onClick={() => setActiveDemo(a)} />
            ))}
          </div>
        </div>
      </div>

      <div className="lp-divider" />

      {/* Why */}
      <section className="lp-section">
        <div className="lp-section-eyebrow">Hvorfor Maintain</div>
        <h2 className="lp-section-title">Vedlikehold er det billigste<br />du kan gjøre</h2>
        <p className="lp-section-sub">De fleste skader skyldes ikke uflaks – de skyldes glemte servicer og utsatt vedlikehold. Maintain holder deg ett steg foran.</p>
        <div className="lp-why-grid">
          {WHY.map((w, i) => (
            <div className="lp-why-card" key={i}>
              <div className="lp-why-icon" style={{ background: w.bg }}>{w.icon}</div>
              <h3>{w.title}</h3>
              <p>{w.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="lp-divider" />

      {/* Categories */}
      <div className="lp-section--bg">
        <div className="lp-section-inner">
          <div className="lp-section-eyebrow">Hva kan du vedlikeholde?</div>
          <h2 className="lp-section-title">Alt du eier. Samlet på ett sted.</h2>
          <p className="lp-section-sub">Legg til kjøretøy direkte fra Statens vegvesen med registreringsnummer, eller opprett hus, hytte, båt og maskiner manuelt.</p>
          <div className="lp-cats">
            {CATEGORIES.map((c, i) => (
              <div className="lp-cat" key={i}><span>{c.emoji}</span><span>{c.name}</span></div>
            ))}
          </div>
        </div>
      </div>

      <div className="lp-divider" />

      {/* Steps */}
      <section className="lp-section">
        <div className="lp-section-eyebrow">Slik fungerer det</div>
        <h2 className="lp-section-title">Fra null til full oversikt<br />på under 5 minutter</h2>
        <div className="lp-steps">
          {STEPS.map((s, i) => (
            <div className="lp-step" key={i}>
              <div className="lp-step-num">{s.num}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="lp-divider" />

      {/* Savings */}
      <div className="lp-section--bg">
        <div className="lp-section-inner">
          <div className="lp-section-eyebrow">Tid og penger</div>
          <h2 className="lp-section-title">Jevnlig vedlikehold lønner seg alltid</h2>
          <p className="lp-section-sub">En motorservice koster noen tusen. En motorhavari koster titusener. Maintain hjelper deg å holde den første kostnaden nede.</p>
          <div className="lp-savings-grid">
            {SAVINGS.map((s, i) => (
              <div className="lp-saving-tile" key={i}>
                <div className="big">{s.big}</div>
                <p>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <section className="lp-cta-section">
        <h2>Klar til å ta kontrollen?</h2>
        <p>Legg til din første eiendel i dag og se hvor enkelt det er å holde oversikt.</p>
        <div className="lp-hero-ctas">
          <button className="lp-btn-primary lp-btn-primary--lg" onClick={onGetStarted}>Kom i gang gratis</button>
          <button className="lp-btn-outline--lg" onClick={onLogin}>Logg inn</button>
        </div>
        <p className="lp-cta-note">Ingen kredittkort. Ingen binding.</p>
      </section>

      {/* Footer */}
      <footer className="lp-footer">
        <div className="lp-footer-logo"><WrenchIcon size={16} /> Maintain</div>
        <p>© {new Date().getFullYear()} Maintain. Alle rettigheter forbeholdt.</p>
      </footer>

      {/* Demo detail modal */}
      {activeDemo && (
        <DemoDetailModal asset={activeDemo} onClose={() => setActiveDemo(null)} />
      )}
    </div>
  )
}
