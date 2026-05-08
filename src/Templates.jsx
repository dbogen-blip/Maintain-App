import { useEffect, useMemo, useState } from 'react'
import { searchTemplates } from './templates'
import Card from './components/Card'
import Button from './components/Button'
import Badge from './components/Badge'
import Icon from './components/Icon'
import EmptyState from './components/EmptyState'
import Spinner from './components/Spinner'
import './Home.css'

function categoryIcon(category) {
  const c = (category || '').toLowerCase()
  if (c === 'bil' || c === 'mc') return 'car'
  if (c === 'båt' || c === 'bat') return 'boat'
  if (c === 'hus' || c === 'hage') return 'home'
  return 'wrench'
}

const COMMON_CATEGORIES = ['Bil', 'Båt', 'Hus', 'Hage', 'Sykkel', 'MC', 'Verktøy']

export default function Templates({ onBack, onOpen }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => { load() }, [search, filter])

  async function load() {
    setLoading(true)
    try {
      const data = await searchTemplates({ q: search, category: filter })
      setItems(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const visibleCategories = useMemo(() => {
    const set = new Set()
    for (const t of items) if (t.category) set.add(t.category)
    return [...new Set([...COMMON_CATEGORIES, ...set])]
  }, [items])

  return (
    <div className="container">
      <Button variant="ghost" icon="arrowLeft" onClick={onBack}>Tilbake</Button>

      <header className="home-header" style={{ marginTop: 'var(--space-3)' }}>
        <div>
          <h1>Bla i fellesbiblioteket</h1>
          <p className="muted">Vedlikeholdsprogram laget av andre — kopier rett inn i din egen samling.</p>
        </div>
      </header>

      <div className="home-toolbar">
        <div className="home-search">
          <Icon name="search" size={18} />
          <input
            placeholder="Søk f.eks. Tesla, gressklipper, oljeskift ..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Søk i maler"
          />
        </div>

        <div className="home-filters">
          <button
            className={`chip${filter === '' ? ' chip-active' : ''}`}
            onClick={() => setFilter('')}
          >Alle</button>
          {visibleCategories.map(c => (
            <button
              key={c}
              className={`chip${filter === c ? ' chip-active' : ''}`}
              onClick={() => setFilter(filter === c ? '' : c)}
            >{c}</button>
          ))}
        </div>
      </div>

      {error && <p style={{ color: 'var(--color-danger-700)' }}>{error}</p>}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
          <Spinner size="md" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon="search"
          title={search || filter ? 'Ingen treff' : 'Fellesbiblioteket er tomt'}
          description={
            search || filter
              ? 'Prøv et annet søkeord eller fjern filteret.'
              : 'Vær den første til å publisere en mal — gå inn på en eiendel og klikk «Publiser som mal».'
          }
        />
      ) : (
        <div className="asset-grid">
          {items.map(t => (
            <Card
              key={t.id}
              className="asset-card"
              onClick={() => onOpen(t.id)}
              role="button"
              tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter') onOpen(t.id) }}
            >
              <div className="asset-cover">
                {t.image_url
                  ? <img src={t.image_url} alt="" />
                  : <Icon name={categoryIcon(t.category)} size={32} />}
              </div>
              <div className="asset-body">
                <h3>{t.name}</h3>
                {t.description && (
                  <p className="muted" style={{ fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-1)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {t.description}
                  </p>
                )}
                <div className="row" style={{ justifyContent: 'space-between', marginTop: 'var(--space-3)' }}>
                  {t.category && <Badge>{t.category}</Badge>}
                  <span className="muted" style={{ fontSize: 'var(--font-size-xs)' }}>
                    {t.forks_count} brukt
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
