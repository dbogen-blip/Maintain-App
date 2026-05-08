import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabaseClient'
import Card from './components/Card'
import Button from './components/Button'
import Badge from './components/Badge'
import Icon from './components/Icon'
import EmptyState from './components/EmptyState'
import Spinner from './components/Spinner'
import AssetForm from './forms/AssetForm'
import { categoryImgProps } from './categoryImages'
import './Home.css'

function categoryIcon(category) {
  const c = (category || '').toLowerCase()
  if (c === 'bil' || c === 'mc') return 'car'
  if (c === 'båt' || c === 'bat') return 'boat'
  if (c === 'hus' || c === 'hage') return 'home'
  return 'wrench'
}

function daysUntil(dateStr) {
  if (!dateStr) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.round((target - today) / 86400000)
}

function assetStatus(tasks) {
  const days = tasks
    .map(t => daysUntil(t.fixed_due_date ?? t.next_due))
    .filter(d => d !== null)
  if (days.length === 0) return { variant: 'neutral', text: 'Ingen oppgaver' }
  const min = Math.min(...days)
  if (min < 0)  return { variant: 'danger',  text: `Forfalt ${-min}d` }
  if (min === 0) return { variant: 'warning', text: 'Forfaller i dag' }
  if (min <= 7)  return { variant: 'warning', text: `Om ${min}d` }
  if (min <= 30) return { variant: 'warning', text: `Om ${min}d` }
  return { variant: 'success', text: `Om ${min}d` }
}

export default function Home({ onOpenAsset, onOpenSettings, onOpenTemplates, onSignOut, user }) {

  function handleSignOut() {
    if (window.confirm('Er du sikker på at du vil logge ut?')) onSignOut()
  }
  const [assets, setAssets]         = useState([])
  const [doneCount, setDoneCount]   = useState(0)
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filter, setFilter]         = useState('')
  const [editing, setEditing]       = useState(null)
  const [markingId, setMarkingId]   = useState(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const start = new Date()
    start.setDate(1)
    start.setHours(0, 0, 0, 0)

    const [{ data }, { count }] = await Promise.all([
      supabase
        .from('assets')
        .select('id, name, category, description, image_url, tasks(id, title, next_due, fixed_due_date)')
        .order('name'),
      supabase
        .from('maintenance_logs')
        .select('id', { count: 'exact', head: true })
        .gte('performed_on', start.toISOString().slice(0, 10)),
    ])
    setAssets(data ?? [])
    setDoneCount(count ?? 0)
    setLoading(false)
  }

  async function quickMarkDone(task) {
    setMarkingId(task.id)
    await supabase.from('maintenance_logs').insert({
      task_id:      task.id,
      asset_id:     task.assetId,
      performed_on: new Date().toISOString().slice(0, 10),
    })
    setMarkingId(null)
    fetchAll()
  }

  const categories = useMemo(() => {
    const set = new Set()
    for (const a of assets) if (a.category) set.add(a.category)
    return [...set].sort()
  }, [assets])

  const stats = useMemo(() => {
    let overdue = 0, soon = 0
    for (const a of assets) {
      for (const t of a.tasks ?? []) {
        const d = daysUntil(t.fixed_due_date ?? t.next_due)
        if (d === null) continue
        if (d < 0) overdue++
        else if (d <= 7) soon++
      }
    }
    return { total: assets.length, overdue, soon }
  }, [assets])

  const attentionTasks = useMemo(() => {
    const items = []
    for (const a of assets) {
      for (const t of a.tasks ?? []) {
        const due = t.fixed_due_date ?? t.next_due
        const d   = daysUntil(due)
        if (d !== null && d <= 7) {
          items.push({ ...t, assetId: a.id, assetName: a.name, assetCategory: a.category, d })
        }
      }
    }
    return items.sort((a, b) => a.d - b.d)
  }, [assets])

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    return assets.filter(a => {
      if (filter && a.category !== filter) return false
      if (!s) return true
      return (
        a.name.toLowerCase().includes(s) ||
        (a.description || '').toLowerCase().includes(s) ||
        (a.category || '').toLowerCase().includes(s)
      )
    })
  }, [assets, search, filter])

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <Spinner size="md" />
    </div>
  )

  return (
    <div>
      {/* ── Top bar ── */}
      <header className="home-topbar">
        <div className="home-brand">
          <div className="home-logo"><Icon name="wrench" size={20} /></div>
          <span className="home-brand-name">Maintain</span>
        </div>
        <nav className="home-topbar-nav">
          <button type="button" className="topbar-nav-btn" onClick={onOpenTemplates}>
            <Icon name="search" size={16} /><span className="nav-label">Bibliotek</span>
          </button>
          <button type="button" className="topbar-nav-btn" onClick={onOpenSettings}>
            <Icon name="settings" size={16} /><span className="nav-label">Innstillinger</span>
          </button>
          <button type="button" className="topbar-nav-btn topbar-nav-btn--muted" onClick={handleSignOut}>
            <Icon name="logout" size={16} /><span className="nav-label">Logg ut</span>
          </button>
        </nav>
      </header>

      <div className="container home-content">

        {/* ── Stats ── */}
        <div className="home-stats">
          <div className="stat-card">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Eiendeler</span>
          </div>
          <div className={`stat-card${stats.overdue > 0 ? ' stat-card--danger' : ''}`}>
            <span className="stat-value">{stats.overdue}</span>
            <span className="stat-label">Forfalt</span>
          </div>
          <div className={`stat-card${stats.soon > 0 ? ' stat-card--warning' : ''}`}>
            <span className="stat-value">{stats.soon}</span>
            <span className="stat-label">Forfaller snart</span>
          </div>
          <div className={`stat-card${doneCount > 0 ? ' stat-card--success' : ''}`}>
            <span className="stat-value">{doneCount}</span>
            <span className="stat-label">Fullført denne måneden</span>
          </div>
        </div>

        {/* ── Trenger oppmerksomhet ── */}
        {attentionTasks.length > 0 && (
          <section className="home-section">
            <div className="home-section-header">
              <h2>Trenger oppmerksomhet</h2>
              <Badge variant={stats.overdue > 0 ? 'danger' : 'warning'}>
                {attentionTasks.length}
              </Badge>
            </div>
            <Card padding={0} className="attention-card">
              {attentionTasks.slice(0, 10).map((task, i) => {
                const d = task.d
                const badge = d < 0
                  ? { variant: 'danger',  text: `Forfalt ${-d}d` }
                  : d === 0
                  ? { variant: 'warning', text: 'I dag' }
                  : { variant: 'warning', text: `Om ${d}d` }
                return (
                  <div
                    key={task.id}
                    className={`attention-row${i > 0 ? ' attention-row--border' : ''}`}
                  >
                    <button
                      className="attention-row-body"
                      onClick={() => onOpenAsset(task.assetId)}
                    >
                      <div>
                        <div className="attention-task-title">{task.title}</div>
                        <div className="attention-asset-name muted">
                          <Icon name={categoryIcon(task.assetCategory)} size={12} />
                          {task.assetName}
                        </div>
                      </div>
                      <Badge variant={badge.variant}>{badge.text}</Badge>
                    </button>
                    <button
                      className="attention-check-btn"
                      title="Marker som utført"
                      disabled={markingId === task.id}
                      onClick={() => quickMarkDone(task)}
                    >
                      {markingId === task.id
                        ? <Spinner size="xs" />
                        : <Icon name="check" size={16} />}
                    </button>
                  </div>
                )
              })}
            </Card>
          </section>
        )}

        {/* ── Mine eiendeler ── */}
        <section className="home-section">
          <div className="home-section-header">
            <h2>Mine eiendeler</h2>
            <Button icon="plus" onClick={() => setEditing({})}>Ny eiendel</Button>
          </div>

          <div className="home-toolbar">
            <div className="home-search">
              <Icon name="search" size={18} />
              <input
                placeholder="Søk i eiendeler ..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                aria-label="Søk"
              />
            </div>
            <div className="home-filters">
              <button className={`chip${filter === '' ? ' chip-active' : ''}`} onClick={() => setFilter('')}>Alle</button>
              {categories.map(c => (
                <button
                  key={c}
                  className={`chip${filter === c ? ' chip-active' : ''}`}
                  onClick={() => setFilter(filter === c ? '' : c)}
                >{c}</button>
              ))}
            </div>
          </div>

          {assets.length === 0 ? (
            <EmptyState
              icon="wrench"
              title="Legg til din første eiendel"
              description="Start med bilen, huset, sykkelen eller hvitevarene dine."
              action={<Button icon="plus" onClick={() => setEditing({})}>Legg til eiendel</Button>}
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon="search"
              title="Ingen treff"
              description="Prøv et annet søk eller fjern filteret."
            />
          ) : (
            <div className="asset-grid">
              {filtered.map(a => {
                const s = assetStatus(a.tasks ?? [])
                const count = (a.tasks ?? []).length
                return (
                  <Card
                    key={a.id}
                    className="asset-card"
                    onClick={() => onOpenAsset(a.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter') onOpenAsset(a.id) }}
                  >
                    <div className="asset-cover">
                      {a.image_url
                        ? <img src={a.image_url} alt="" />
                        : <img {...categoryImgProps(a.category)} alt="" />}
                    </div>
                    <div className="asset-body">
                      <h3>{a.name}</h3>
                      <div className="asset-body-row">
                        {a.category && <Badge>{a.category}</Badge>}
                        <span className="asset-task-count">
                          <Icon name="list" size={12} />{count} oppgave{count !== 1 ? 'r' : ''}
                        </span>
                      </div>
                      <div style={{ marginTop: 'var(--space-2)' }}>
                        <Badge variant={s.variant}>{s.text}</Badge>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {editing && (
        <AssetForm
          asset={editing.id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={fetchAll}
        />
      )}
    </div>
  )
}
