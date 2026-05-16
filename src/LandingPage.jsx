import './LandingPage.css'

const MOCK_TASKS = [
  {
    asset: 'BMW 320i',
    assetIcon: '🚗',
    assetBg: '#EFF6FF',
    title: 'Skifte motorolje og filter',
    desc: 'Anbefalt hvert 15 000 km eller én gang i året. Gammel olje øker slitasje på motor og kan gi dyre skader.',
    badge: 'Forfalt',
    badgeType: 'danger',
    due: 'Forfalt for 12 dager siden',
  },
  {
    asset: 'Hytte Geilo',
    assetIcon: '🏔️',
    assetBg: '#F0FDF4',
    title: 'Rens og sjekk takrenner',
    desc: 'Tilstoppede takrenner fører til vannskader på vegger og fundament. Bør gjøres hver høst.',
    badge: 'Snart',
    badgeType: 'warning',
    due: 'Om 8 dager',
  },
  {
    asset: 'Bayliner 190',
    assetIcon: '⛵',
    assetBg: '#EFF6FF',
    title: 'Motorservice og impeller',
    desc: 'Impelleren bør byttes hvert år. Svikt kan gi overoppheting og motorskade som koster titusener.',
    badge: 'OK',
    badgeType: 'success',
    due: 'Om 45 dager',
  },
  {
    asset: 'Trek Emonda',
    assetIcon: '🚲',
    assetBg: '#FFF7ED',
    title: 'Kjede, girjustering og bremser',
    desc: 'Et slitt kjede ødelegger kasetten og kranken. Enkel service forhindrer kostbare delbytte.',
    badge: 'Planlagt',
    badgeType: 'neutral',
    due: 'Om 3 måneder',
  },
  {
    asset: 'Enebolig Stavanger',
    assetIcon: '🏠',
    assetBg: '#F0FDF4',
    title: 'EU-kontroll — Toyota RAV4',
    desc: 'Kjøretøykontroll fristen nærmer seg. Appen lager automatisk oppgaven fra registreringsnummeret.',
    badge: 'Snart',
    badgeType: 'warning',
    due: 'Om 22 dager',
  },
  {
    asset: 'Husqvarna 450X',
    assetIcon: '🏍️',
    assetBg: '#FDF4FF',
    title: 'Luftfilter og forgasser',
    desc: 'Et tilstoppet luftfilter gir dårlig ytelse og økt bensinforbruk. Sjekkes etter hver sesong.',
    badge: 'OK',
    badgeType: 'success',
    due: 'Om 2 måneder',
  },
]

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
  {
    num: '1',
    title: 'Legg til eiendelen din',
    desc: 'Skriv inn registreringsnummer så henter appen info fra Statens vegvesen automatisk. Eller legg til hus, båt, hytte – hva som helst.',
  },
  {
    num: '2',
    title: 'Få vedlikeholdsplan automatisk',
    desc: 'Appen foreslår en komplett vedlikeholdskalender basert på hva du eier. Godkjenn, tilpass og du er i gang.',
  },
  {
    num: '3',
    title: 'Få påminnelser',
    desc: 'Ingen ting faller gjennom sprekker. Du får beskjed i god tid før frister nærmer seg – enten det er EU-kontroll eller vinterklargjøring.',
  },
  {
    num: '4',
    title: 'Unngå dyre overraskelser',
    desc: 'Regelmessig vedlikehold forhindrer store skader. Logg utført arbeid og ha full historikk tilgjengelig når du trenger det.',
  },
]

const WHY = [
  {
    icon: '🔍',
    bg: '#EFF6FF',
    title: 'Full oversikt – ett sted',
    desc: 'Samle vedlikeholdet for alle tingene dine på ett sted. Bil, båt, hus, hytte – alt i én app.',
  },
  {
    icon: '🔔',
    bg: '#FFF7ED',
    title: 'Aldri glem en frist',
    desc: 'EU-kontroll, motorservice, vinterklargjøring. Appen minner deg i god tid slik at du rekker å planlegge.',
  },
  {
    icon: '💸',
    bg: '#F0FDF4',
    title: 'Spar store summer',
    desc: 'Forsømt vedlikehold er dyrt. En ødelagt impeller, tett takrenne eller slitt kjede koster langt mer å reparere enn å forebygge.',
  },
  {
    icon: '📋',
    bg: '#FDF4FF',
    title: 'Historikk og dokumentasjon',
    desc: 'Logg utført arbeid med dato og kostnad. Nyttig ved salg, forsikringssak eller garantikrav.',
  },
]

const SAVINGS = [
  { big: '3–5×', label: 'Dyrere å reparere enn å forebygge motorskade' },
  { big: '10 min', label: 'Nok til å sette opp full vedlikeholdsplan for bilen din' },
  { big: '100%', label: 'Gratis å komme i gang – ingen betalingsmur' },
  { big: 'Alt', label: 'Fra bil og båt til hytte og hage – samlet på ett sted' },
]

export default function LandingPage({ onGetStarted, onLogin }) {
  return (
    <div className="lp">
      {/* Nav */}
      <nav className="lp-nav">
        <div className="lp-nav-logo">
          <div className="lp-nav-logo-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
            </svg>
          </div>
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
        <h1>
          Unngå dyre skader.<br />
          <span>Ta vare på tingene dine.</span>
        </h1>
        <p className="lp-hero-sub">
          Maintain gir deg full oversikt over vedlikeholdet for alt du eier –
          bil, båt, hus og hytte. Automatiske påminnelser, enkel loggføring og
          ferdig vedlikeholdsplan. Færre overraskelser, lavere kostnader.
        </p>
        <div className="lp-hero-ctas">
          <button className="lp-btn-primary lp-btn-primary--lg" onClick={onGetStarted}>
            Kom i gang gratis
          </button>
          <button className="lp-btn-outline--lg" onClick={onLogin}>
            Logg inn
          </button>
        </div>
        <p className="lp-hero-note">Ingen kredittkort. Ingen betalingsmur.</p>
      </section>

      {/* Mock task cards */}
      <div className="lp-preview">
        <div className="lp-preview-inner">
          {MOCK_TASKS.map((t, i) => (
            <div className="lp-task-card" key={i}>
              <div className="lp-task-card-header">
                <div className="lp-task-card-asset">
                  <div className="lp-task-card-asset-icon" style={{ background: t.assetBg }}>
                    {t.assetIcon}
                  </div>
                  <span className="lp-task-card-asset-name">{t.asset}</span>
                </div>
                <span className={`lp-badge lp-badge--${t.badgeType}`}>{t.badge}</span>
              </div>
              <div className="lp-task-title">{t.title}</div>
              <div className="lp-task-desc">{t.desc}</div>
              <div className="lp-task-meta">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                {t.due}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="lp-divider" />

      {/* Why */}
      <section className="lp-section">
        <div className="lp-section-eyebrow">Hvorfor Maintain</div>
        <h2 className="lp-section-title">Vedlikehold er det billigste<br />du kan gjøre</h2>
        <p className="lp-section-sub">
          De fleste skader skyldes ikke uflaks – de skyldes glemte servicer og utsatt vedlikehold.
          Maintain holder deg ett steg foran.
        </p>
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
          <p className="lp-section-sub">
            Legg til kjøretøy direkte fra Statens vegvesen med registreringsnummer,
            eller opprett hus, hytte, båt og maskiner manuelt.
          </p>
          <div className="lp-cats">
            {CATEGORIES.map((c, i) => (
              <div className="lp-cat" key={i}>
                <span>{c.emoji}</span>
                <span>{c.name}</span>
              </div>
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
          <p className="lp-section-sub">
            En motorservice koster noen tusen. En motorhavari koster titusener.
            Maintain hjelper deg å holde den første kostnaden nede – og unngå den andre.
          </p>
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
        <p>
          Legg til din første eiendel i dag og se hvor enkelt
          det er å holde oversikt.
        </p>
        <div className="lp-hero-ctas">
          <button className="lp-btn-primary lp-btn-primary--lg" onClick={onGetStarted}>
            Kom i gang gratis
          </button>
          <button className="lp-btn-outline--lg" onClick={onLogin}>
            Logg inn
          </button>
        </div>
        <p className="lp-cta-note">Ingen kredittkort. Ingen binding.</p>
      </section>

      {/* Footer */}
      <footer className="lp-footer">
        <div className="lp-footer-logo">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
          Maintain
        </div>
        <p>© {new Date().getFullYear()} Maintain. Alle rettigheter forbeholdt.</p>
      </footer>
    </div>
  )
}
