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
      description: 'Merke: TOYOTA\nModell: RAV4\nÅrsmodell: 2019\nDrivstoff: Bensin\nFarge: Hvit\nEgenvekt: 1560 kg\nTilhengervekt (med brems): 1800 kg',
      eu_date: '2025-09-15',
    },
    tasks: [
      { id: 1, title: 'EU-kontroll',                       days: -5,  priority: 1, desc: 'Periodisk kjøretøykontroll. Dato hentet automatisk fra Statens vegvesen ved opprettelse.' },
      { id: 2, title: 'Skifte motorolje og filter',         days: 45,  priority: 1, desc: 'Anbefalt hvert 15 000 km eller 1 år. Forhindrer slitasje og motorskade.' },
      { id: 3, title: 'Dekkbytte sommer/vinter',           days: 18,  priority: 2, desc: 'Skifte til vinterdekk innen 1. november.' },
      { id: 4, title: 'Skifte luftfilter',                 days: 120, priority: 2, desc: 'Hvert 2. år eller 30 000 km.' },
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
      { id: 4, title: 'Oljebehandle terrasse',             days: 90,  priority: 2, desc: 'Beskytter treverk mot fukt og råte. Hvert 1–2 år.' },
      { id: 5, title: 'Service varmepumpe',                days: 180, priority: 2, desc: 'Rengjøring av filter og kontroll av kjølemiddel.' },
      { id: 6, title: 'Kontroller drenering rundt hus',    days: 365, priority: 1, desc: 'Sjekk at dreneringsrør og grøfter er frie for blokkering.' },
    ],
  },
  {
    id: 'hytte',
    name: 'Hytte Vrådal',
    category: 'Hytte',
    tasks: [
      { id: 1, title: 'Vedlikehold brygge',                days: -10, priority: 2, desc: 'Oljebehandle brygge og sjekk bolter og fortøyninger.' },
      { id: 2, title: 'Vinterklargjøring',                 days: 21,  priority: 1, desc: 'Tøm vannrør, steng ventiler og sikre mot frost.' },
      { id: 3, title: 'Rens kamin og pipe',                days: 60,  priority: 1, desc: 'Fjern sot og aske. Kontroller pakning i kamindøren.' },
      { id: 4, title: 'Sjekk tak og tetting',              days: 90,  priority: 1, desc: 'Kontroller takstein og tetting rundt vinduer etter vinteren.' },
      { id: 5, title: 'Service diesel aggregat',           days: 120, priority: 1, desc: 'Olje, filter og tennplugg.' },
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
      description: 'Merke: HOBBY\nModell: 490 UL\nÅrsmodell: 2018\nFarge: Hvit\nEgenvekt: 1250 kg\nNyttelast: 180 kg',
      eu_date: null,
    },
    tasks: [
      { id: 1, title: 'Kontroller lys og elektrisk',       days: 7,   priority: 2, desc: 'Sjekk bremselys, blinklys og stikkontakten for rust.' },
      { id: 2, title: 'Sjekk dekk og hjul',                days: 7,   priority: 2, desc: 'Lufttrykk, mønster, tørrråte og etterstram hjulmutre.' },
      { id: 3, title: 'Tøm hele vannsystemet',             days: 21,  priority: 1, desc: 'Vinterklargjøring: tøm pumpe, tank og varmtvannsbereder.' },
      { id: 4, title: 'Forebygg kondens og fukt',          days: 21,  priority: 2, desc: 'Åpne skap, sett madrasser på høykant og bruk fuktsluker.' },
      { id: 5, title: 'Bremseservice på verksted',         days: 365 * 4, priority: 1, desc: 'Komplett gjennomgang av bremsetrommer og påløpsbrems.' },
    ],
  },
  {
    id: 'sykkel',
    name: 'Trek Marlin 5',
    category: 'Sykkel',
    tasks: [
      { id: 1, title: 'Kjede og girjustering',             days: 14,  priority: 1, desc: 'Rengjør og smør kjede. Juster girskifter for presis giring.' },
      { id: 2, title: 'Sjekk lufttrykk og dekk',           days: 14,  priority: 2, desc: 'Pumpe til riktig trykk og se etter kutt eller slitasje.' },
      { id: 3, title: 'Sjekk bremser og bremseklosser',    days: 30,  priority: 1, desc: 'Kontroller slitasje og justering.' },
      { id: 4, title: 'Vask og helgjennomgang',            days: 60,  priority: 2, desc: 'Komplett rengjøring og kontroll av alle bolter og lager.' },
    ],
  },
  {
    id: 'hage',
    name: 'Hage hjemme',
    category: 'Hage',
    tasks: [
      { id: 1, title: 'Service gressklipper',              days: -3,  priority: 1, desc: 'Rengjøring, olje og slip kniv. Gjøres hver sesong.' },
      { id: 2, title: 'Gjødsle plener',                    days: 14,  priority: 2, desc: 'Høstgjødsling med kalium og fosfor.' },
      { id: 3, title: 'Klipp og form hekk',                days: 30,  priority: 2, desc: 'Siste klipp av sesongen etter 1. september.' },
      { id: 4, title: 'Vinterklargjøre hagemøbler',        days: 45,  priority: 2, desc: 'Rens, tørk og lagre innendørs eller dekk til.' },
    ],
  },
]

// ── Static content ─────────────────────────────────────────────────────────
const FORGOTTEN = [
  'EU-kontroll',
  'Varmepumpefilter',
  'Impeller (båtmotor)',
  'Bremsevæske',
  'Frostsikring campingvogn',
  'Batteriskift røykvarsler',
  'Dekkbytte',
  'Snu brannslukningsapparat',
  'Vaske ventilatorfilter',
  'Male huset',
  'Polere bilen',
]

const STEPS = [
  {
    title: 'Legg til eiendelen',
    desc: 'Reg.nr. henter data fra Statens vegvesen på sekunder – inkludert EU-kontroll-dato. Hus, hytte og båt legges inn manuelt.',
    iconBg: '#eff6ff',
    iconColor: '#3b82f6',
  },
  {
    title: 'Få ferdig vedlikeholdsplan',
    desc: 'Appen foreslår en komplett kalender basert på hva du eier. Godkjenn og juster – klar på under 5 minutter.',
    iconBg: '#f0fdf4',
    iconColor: '#22c55e',
  },
  {
    title: 'Motta påminnelser',
    desc: 'Aldri glem en frist. EU-kontroll, motorservice, vinterklargjøring – du får beskjed i god tid.',
    iconBg: '#fffbeb',
    iconColor: '#f59e0b',
  },
  {
    title: 'Unngå dyre overraskelser',
    desc: 'Logg utført arbeid og ha full historikk tilgjengelig ved salg, forsikring eller garantikrav.',
    iconBg: '#fdf4ff',
    iconColor: '#a855f7',
  },
]

const CATEGORY_CARDS = [
  { name: 'Bil',               category: 'Bil' },
  { name: 'Hus',               category: 'Hus' },
  { name: 'Leilighet',         category: 'Leilighet' },
  { name: 'Hytte',             category: 'Hytte' },
  { name: 'Hage',              category: 'Hage' },
  { name: 'Båt',               category: 'Båt' },
  { name: 'Bobil',             category: 'Bobil' },
  { name: 'Campingvogn',       category: 'Campingvogn' },
  { name: 'MC / ATV',          category: 'MC/ATV' },
  { name: 'Sykkel',            category: 'Sykkel' },
  { name: 'Tilhenger',         category: 'Tilhenger' },
  { name: 'Traktor / Maskin',  category: 'Traktor/Maskin' },
  { name: 'Bensindrevet verktøy', category: 'Bensindrevne verktøy' },
  { name: 'Annet',             category: 'Annet' },
]

const BEFORE = ['Glemte servicer', 'Dyre overraskelser', 'Lite oversikt', 'Stress og usikkerhet']
const AFTER  = ['Full kontroll', 'Automatiske påminnelser', 'Komplett historikk', 'Ro i hverdagen']

// ── Helpers ────────────────────────────────────────────────────────────────
function taskBadge(days) {
  if (days < 0)   return { label: `Forfalt ${-days}d`,    cls: 'lp-tbadge--danger'  }
  if (days === 0) return { label: 'I dag',                cls: 'lp-tbadge--danger'  }
  if (days <= 7)  return { label: `Om ${days} dag${days === 1 ? '' : 'er'}`, cls: 'lp-tbadge--warning' }
  if (days <= 30) return { label: `Om ${days} dager`,    cls: 'lp-tbadge--warning' }
  if (days < 365) return { label: `Om ${days} dager`,    cls: 'lp-tbadge--neutral' }
  const yrs = Math.round(days / 365)
  return           { label: `Om ${yrs} år`,               cls: 'lp-tbadge--neutral' }
}
function assetStatus(tasks) {
  const overdue = tasks.filter(t => t.days < 0)
  const soon    = tasks.filter(t => t.days >= 0 && t.days <= 14)
  if (overdue.length > 0) return { level: 'overdue', label: 'Forfalt' }
  if (soon.length > 0)    return { level: 'warning', label: 'Snart'   }
  return                         { level: 'ok',       label: 'Alt OK'  }
}
function nextTask(tasks) {
  return [...tasks].sort((a, b) => a.days - b.days)[0] ?? null
}

// ── Step icons ─────────────────────────────────────────────────────────────
function StepIcon({ n, color }) {
  const s = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }
  if (n === 1) return (
    <svg {...s}><rect x="3" y="3" width="18" height="18" rx="3"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="13" y2="13"/><circle cx="17" cy="17" r="3"/><line x1="21" y1="21" x2="19.12" y2="19.12"/></svg>
  )
  if (n === 2) return (
    <svg {...s}><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="15" y2="11"/><polyline points="9 15 11 17 15 13"/></svg>
  )
  if (n === 3) return (
    <svg {...s}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
  )
  return (
    <svg {...s}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
  )
}

// ── Reg.nr.-oppslagskomponent ──────────────────────────────────────────────
function RegnrDemo({ initialRegnr = '', mockResult = null }) {
  const [regnr, setRegnr]     = useState(initialRegnr)
  const [result, setResult]   = useState(mockResult)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [tried, setTried]     = useState(!!mockResult)

  async function lookup() {
    const nr = regnr.trim().toUpperCase().replace(/\s/g, '')
    if (!nr) return
    setLoading(true); setError(null); setResult(null); setTried(true)
    try {
      const res  = await fetch(`${SUPABASE_URL}/functions/v1/lookup-vehicle?regnr=${encodeURIComponent(nr)}`)
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
      {!tried && <div className="lp-regnr-hint">Prøv med ditt eget reg.nr. – eller bruk eksempelet over</div>}
    </div>
  )
}

// ── Demo detail modal ──────────────────────────────────────────────────────
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

function DemoDetailModal({ asset, onClose }) {
  if (!asset) return null
  const status   = assetStatus(asset.tasks)
  const next     = nextTask(asset.tasks)
  const overdue  = asset.tasks.filter(t => t.days < 0)
  const soon     = asset.tasks.filter(t => t.days >= 0 && t.days <= 30)
  const upcoming = asset.tasks.filter(t => t.days > 30)
  const isVehicle = ['Bil', 'MC/ATV', 'Campingvogn', 'Bobil', 'Tilhenger'].includes(asset.category)
  const nextText = !next ? null
    : next.days < 0  ? `Forfalt for ${-next.days} dag${-next.days === 1 ? '' : 'er'} siden`
    : next.days === 0 ? 'I dag'
    : `Om ${next.days} dag${next.days === 1 ? '' : 'er'}`

  return (
    <div className="lp-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="lp-modal">
        <div className="lp-modal-header">
          <div className="lp-demo-badge">Demo · Les-modus</div>
          <button className="lp-modal-close" onClick={onClose} aria-label="Lukk">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="lp-modal-body">
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
          {isVehicle && asset.regnr && (
            <RegnrDemo initialRegnr={asset.regnr} mockResult={asset.vehicleMockResult ?? null} />
          )}
          <div className="lp-modal-tasks">
            {overdue.length  > 0 && <TaskGroup label="Forfalt"  tasks={overdue}  variant="danger"  />}
            {soon.length     > 0 && <TaskGroup label="Snart"    tasks={soon}     variant="warning" />}
            {upcoming.length > 0 && <TaskGroup label="Planlagt" tasks={upcoming} variant="neutral" />}
          </div>
          <div className="lp-modal-cta">
            <p>Dette er en eksempelvisning. Logg inn for å legge til dine egne eiendeler og vedlikeholdsplaner.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Big demo card (Bil + Hus featured cards) ───────────────────────────────
function LandingDemoCard({ asset, onClick }) {
  const s    = assetStatus(asset.tasks)
  const next = nextTask(asset.tasks)
  const nextLabel = !next ? null
    : next.days < 0  ? `Forfalt for ${-next.days} dager siden`
    : next.days === 0 ? 'I dag'
    : `Om ${next.days} dager`

  return (
    <div
      className="lp-bigcard"
      role="button" tabIndex={0}
      onClick={onClick}
      onKeyDown={e => e.key === 'Enter' && onClick()}
    >
      <div className="lp-bigcard-img">
        <img {...categoryImgProps(asset.category)} alt={asset.category} />
      </div>
      <div className="lp-bigcard-body">
        <div className="lp-bigcard-top">
          <div>
            <p className="lp-bigcard-cat">{asset.category}</p>
            <h3 className="lp-bigcard-name">{asset.name}</h3>
          </div>
          <span className={`lp-bigcard-status lp-bigcard-status--${s.level}`}>
            <span className="lp-bigcard-dot" />{s.label}
          </span>
        </div>
        {next && (
          <div className="lp-bigcard-next">
            <p className="lp-bigcard-next-lbl">Neste oppgave</p>
            <div className="lp-bigcard-next-row">
              <span className="lp-bigcard-next-title">{next.title}</span>
              <span className={`lp-bigcard-next-when${next.days <= 0 ? ' lp-bigcard-next-when--overdue' : ''}`}>
                {nextLabel}
              </span>
            </div>
          </div>
        )}
        <div className="lp-bigcard-action">
          Se vedlikeholdsplan
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </div>
    </div>
  )
}

// ── App mockup (static HTML replica of the dashboard) ─────────────────────
function AppMockup() {
  return (
    <div className="lp-phone">
      <div className="lp-mock-status">
        <span>9:41</span>
        <div className="lp-mock-status-icons">
          <svg width="14" height="10" viewBox="0 0 24 16" fill="currentColor"><rect x="0"  y="6" width="4" height="10" rx="1"/><rect x="6"  y="4" width="4" height="12" rx="1"/><rect x="12" y="1" width="4" height="15" rx="1"/><rect x="18" y="0" width="4" height="16" rx="1" opacity=".35"/></svg>
          <svg width="14" height="11" viewBox="0 0 24 18" fill="currentColor"><path d="M12 4.5C7 4.5 2.7 6.9 0 10.6L3 13c2.1-2.7 5.3-4.5 9-4.5s6.9 1.8 9 4.5l3-2.4C21.3 6.9 17 4.5 12 4.5z"/><path d="M12 9c-3.3 0-6.2 1.4-8.2 3.7l3 2.4c1.3-1.5 3.2-2.5 5.2-2.5s3.9 1 5.2 2.5l3-2.4C18.2 10.4 15.3 9 12 9z"/><circle cx="12" cy="17" r="2"/></svg>
          <svg width="22" height="11" viewBox="0 0 30 14" fill="none"><rect x="1" y="1" width="24" height="12" rx="3" stroke="currentColor" strokeWidth="1.5" fill="none"/><rect x="26" y="4" width="2" height="6" rx="1" fill="currentColor" opacity=".5"/><rect x="2.5" y="2.5" width="18" height="9" rx="2" fill="currentColor"/></svg>
        </div>
      </div>
      <div className="lp-mock-header">
        <div className="lp-mock-brand">
          <div className="lp-mock-logo-icon">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
          </div>
          <span>Maintain</span>
        </div>
        <div className="lp-mock-nav-icons">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </div>
      </div>
      <div className="lp-mock-body">
        <div className="lp-mock-section-head">
          <span className="lp-mock-section-title">Trenger oppmerksomhet</span>
          <span className="lp-mock-count lp-mock-count--danger">2</span>
        </div>
        <div className="lp-mock-card">
          <div className="lp-mock-att-row">
            <div className="lp-mock-att-text">
              <div className="lp-mock-att-task">EU-kontroll</div>
              <div className="lp-mock-att-asset">🚗 Toyota RAV4</div>
            </div>
            <span className="lp-mock-pill lp-mock-pill--danger">Forfalt 5d</span>
            <div className="lp-mock-check-btn">✓</div>
          </div>
          <div className="lp-mock-att-row lp-mock-att-row--border">
            <div className="lp-mock-att-text">
              <div className="lp-mock-att-task">Rens takrenner</div>
              <div className="lp-mock-att-asset">🏠 Enebolig Stavanger</div>
            </div>
            <span className="lp-mock-pill lp-mock-pill--warning">Om 5d</span>
            <div className="lp-mock-check-btn">✓</div>
          </div>
          <div className="lp-mock-att-row lp-mock-att-row--border">
            <div className="lp-mock-att-text">
              <div className="lp-mock-att-task">Dekkbytte sommer/vinter</div>
              <div className="lp-mock-att-asset">🚗 Toyota RAV4</div>
            </div>
            <span className="lp-mock-pill lp-mock-pill--warning">Om 18d</span>
            <div className="lp-mock-check-btn">✓</div>
          </div>
        </div>
        <div className="lp-mock-section-head" style={{ marginTop: 10 }}>
          <span className="lp-mock-section-title">Mine eiendeler</span>
          <span className="lp-mock-add-btn">+ Ny</span>
        </div>
        <div className="lp-mock-asset-card">
          <div className="lp-mock-ac-top">
            <div className="lp-mock-ac-thumb"><img {...categoryImgProps('Bil')} alt="" /></div>
            <div className="lp-mock-ac-info">
              <div className="lp-mock-ac-name">Toyota RAV4</div>
              <span className="lp-mock-ac-cat">Bil</span>
            </div>
          </div>
          <div className="lp-mock-ac-mid">
            <div className="lp-mock-ac-next">
              <div className="lp-mock-ac-lbl">Neste oppgave</div>
              <div className="lp-mock-ac-task">EU-kontroll · <span className="lp-mock-overdue">forfalt</span></div>
            </div>
            <div>
              <div className="lp-mock-ac-lbl" style={{ textAlign: 'right' }}>Status</div>
              <span className="lp-mock-status-pill lp-mock-status-pill--overdue"><span className="lp-mock-dot" />Forfalt</span>
            </div>
          </div>
          <div className="lp-mock-ac-stats">
            <div className="lp-mock-ac-stat"><strong>5</strong><span>oppgaver</span></div>
            <div className="lp-mock-ac-stat"><strong>2/5</strong><span>utført</span></div>
            <div className="lp-mock-ac-stat"><strong>Forfalt</strong><span>neste</span></div>
          </div>
        </div>
        <div className="lp-mock-asset-card">
          <div className="lp-mock-ac-top">
            <div className="lp-mock-ac-thumb"><img {...categoryImgProps('Hus')} alt="" /></div>
            <div className="lp-mock-ac-info">
              <div className="lp-mock-ac-name">Enebolig Stavanger</div>
              <span className="lp-mock-ac-cat">Hus</span>
            </div>
          </div>
          <div className="lp-mock-ac-mid">
            <div className="lp-mock-ac-next">
              <div className="lp-mock-ac-lbl">Neste oppgave</div>
              <div className="lp-mock-ac-task">Rens takrenner · <span className="lp-mock-warning">om 5d</span></div>
            </div>
            <div>
              <div className="lp-mock-ac-lbl" style={{ textAlign: 'right' }}>Status</div>
              <span className="lp-mock-status-pill lp-mock-status-pill--warning"><span className="lp-mock-dot" />Snart</span>
            </div>
          </div>
          <div className="lp-mock-ac-stats">
            <div className="lp-mock-ac-stat"><strong>6</strong><span>oppgaver</span></div>
            <div className="lp-mock-ac-stat"><strong>3/6</strong><span>utført</span></div>
            <div className="lp-mock-ac-stat"><strong>5 dager</strong><span>neste</span></div>
          </div>
        </div>
        <div className="lp-mock-asset-card lp-mock-asset-card--partial">
          <div className="lp-mock-ac-top">
            <div className="lp-mock-ac-thumb"><img {...categoryImgProps('Hytte')} alt="" /></div>
            <div className="lp-mock-ac-info">
              <div className="lp-mock-ac-name">Hytte Vrådal</div>
              <span className="lp-mock-ac-cat">Hytte</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

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

      {/* ── Nav ── */}
      <nav className="lp-nav">
        <div className="lp-nav-logo">
          <div className="lp-nav-logo-icon"><WrenchIcon size={18} /></div>
          Maintain
        </div>
        <div className="lp-nav-actions">
          <button className="lp-btn-ghost" onClick={onLogin}>Logg inn</button>
          <button className="lp-btn-primary" onClick={onGetStarted}>Kom i gang!</button>
        </div>
      </nav>

      {/* ── Hero (dark navy) ── */}
      <section className="lp-hero-section">
        <div className="lp-hero-noise" aria-hidden="true" />
        <div className="lp-hero-inner">
          {/* Left: text + CTAs */}
          <div className="lp-hero-text">
            <div className="lp-hero-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
              For bolig, bil, båt og mer
            </div>
            <h1>
              Alt du eier.<br />
              <span>Alltid vedlikeholdt.</span>
            </h1>
            <div className="lp-hero-ctas">
              <button className="lp-btn-primary lp-btn-primary--lg" onClick={onGetStarted}>Kom i gang</button>
              <button className="lp-btn-outline--lg lp-btn-outline--light" onClick={onLogin}>Logg inn</button>
            </div>
          </div>

          {/* Desktop right column: full-size phone */}
          <div className="lp-hero-visual">
            <AppMockup />
          </div>

          {/* Mobile only: phone with glow + floating notification bubbles */}
          <div className="lp-hero-phone-mobile">
            <div className="lp-hero-phone-glow" aria-hidden="true" />
            <div className="lp-fb lp-fb--1">
              <span className="lp-fb-dot lp-fb-dot--green" />
              Påminnelse sendt ✓
            </div>
            <div className="lp-fb lp-fb--2">
              🚗 EU-kontroll om 5 dager
            </div>
            <AppMockup />
          </div>
        </div>
      </section>

      {/* ── Aha: Ting folk glemmer (light gray) ── */}
      <section className="lp-section-gray">
        <div className="lp-inner lp-inner--center">
          <p className="lp-eyebrow">Gjenkjenner du dette?</p>
          <h2 className="lp-h2">Ting folk faktisk glemmer</h2>
          <div className="lp-forgotten-grid">
            {FORGOTTEN.map(item => (
              <div key={item} className="lp-forgotten-item">
                <span className="lp-forgotten-x">✕</span>
                {item}
              </div>
            ))}
          </div>
          <div className="lp-forgotten-answer">
            <p>Maintain husker det for deg.</p>
            <button className="lp-btn-primary lp-btn-primary--lg" onClick={onGetStarted}>
              Kom i gang
            </button>
          </div>
        </div>
      </section>

      {/* ── Demo cards (white) ── */}
      <section className="lp-section-white">
        <div className="lp-inner">
          <p className="lp-eyebrow">Se hvordan det fungerer</p>
          <h2 className="lp-h2">Trykk på en eiendel</h2>
          <p className="lp-sub">Klikk for å se vedlikeholdsplan, oppgaver og automatisk reg.nr.-oppslag fra Statens vegvesen.</p>
          <div className="lp-bigcard-grid">
            {DEMO_ASSETS.filter(a => ['bil', 'hus', 'hage'].includes(a.id)).map(a => (
              <LandingDemoCard key={a.id} asset={a} onClick={() => setActiveDemo(a)} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Før / Etter (dark navy) ── */}
      <section className="lp-before-after-section">
        <div className="lp-inner">
          <p className="lp-eyebrow lp-eyebrow--light">Resultater</p>
          <h2 className="lp-h2 lp-h2--light">Det gjør en forskjell</h2>
          <div className="lp-ba-grid">
            <div className="lp-ba-col lp-ba-col--before">
              <div className="lp-ba-label">Uten Maintain</div>
              {BEFORE.map(item => (
                <div key={item} className="lp-ba-item lp-ba-item--before">
                  <span className="lp-ba-icon lp-ba-icon--x">✕</span>
                  {item}
                </div>
              ))}
            </div>
            <div className="lp-ba-divider" />
            <div className="lp-ba-col lp-ba-col--after">
              <div className="lp-ba-label">Med Maintain</div>
              {AFTER.map(item => (
                <div key={item} className="lp-ba-item lp-ba-item--after">
                  <span className="lp-ba-icon lp-ba-icon--check">✓</span>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Slik fungerer det (light gray) ── */}
      <section className="lp-section-gray">
        <div className="lp-inner">
          <p className="lp-eyebrow">Slik fungerer det</p>
          <h2 className="lp-h2">Fra null til full oversikt<br />på 5 minutter</h2>
          <div className="lp-steps-grid">
            {STEPS.map((s, i) => (
              <div key={i} className="lp-step-card">
                <div className="lp-step-card-top">
                  <div className="lp-step-card-icon" style={{ background: s.iconBg }}>
                    <StepIcon n={i + 1} color={s.iconColor} />
                  </div>
                  <div className="lp-step-card-num">{i + 1}</div>
                </div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Kategorier (white) ── */}
      <section className="lp-section-white">
        <div className="lp-inner">
          <p className="lp-eyebrow">Hva kan du vedlikeholde?</p>
          <h2 className="lp-h2">Alt du eier. Samlet.</h2>
          <div className="lp-catcard-grid">
            {CATEGORY_CARDS.map(c => (
              <div key={c.category} className="lp-catcard">
                <div className="lp-catcard-img">
                  <img {...categoryImgProps(c.category)} alt={c.name} />
                </div>
                <span className="lp-catcard-name">{c.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats belt (gray) ── */}
      <section className="lp-stats-belt">
        <div className="lp-inner lp-inner--stats">
          <div className="lp-stat-item">
            <span className="lp-stat-num">3–5×</span>
            <span className="lp-stat-label">Dyrere å reparere enn å forebygge</span>
          </div>
          <div className="lp-stat-divider" />
          <div className="lp-stat-item">
            <span className="lp-stat-num">5 min</span>
            <span className="lp-stat-label">Nok til å komme i gang</span>
          </div>
          <div className="lp-stat-divider" />
          <div className="lp-stat-item">
            <span className="lp-stat-num">100%</span>
            <span className="lp-stat-label">Gratis å starte – ingen betalingsmur</span>
          </div>
        </div>
      </section>

      {/* ── Final CTA (dark navy) ── */}
      <section className="lp-cta-section">
        <p className="lp-eyebrow lp-eyebrow--light">Klar?</p>
        <h2>Ta kontroll i dag.</h2>
        <p>Legg til din første eiendel på under 5 minutter.</p>
        <div className="lp-hero-ctas" style={{ justifyContent: 'center' }}>
          <button className="lp-btn-primary lp-btn-primary--lg lp-btn-primary--inv" onClick={onGetStarted}>Kom i gang</button>
          <button className="lp-btn-outline--lg lp-cta-login-btn" onClick={onLogin}>Logg inn</button>
        </div>
        <p className="lp-cta-note">Ingen kredittkort · Ingen binding</p>
      </section>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-footer-logo"><WrenchIcon size={16} /> Maintain</div>
        <p>© {new Date().getFullYear()} Maintain · Alle rettigheter forbeholdt</p>
      </footer>

      {activeDemo && (
        <DemoDetailModal asset={activeDemo} onClose={() => setActiveDemo(null)} />
      )}
    </div>
  )
}
