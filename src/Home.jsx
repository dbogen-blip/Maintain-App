// Main dashboard. Lists all assets owned by the current user and surfaces
// tasks that need attention soon.
// next_due is a generated column in Postgres (last_done + interval_days), so
// it is read-only in the frontend — we never write it directly.
// The attentionTasks panel shows any task whose effective due date
// (fixed_due_date ?? next_due) falls within the next 7 days or is already
// overdue, sorted by urgency.
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import Card from './components/Card'
import Button from './components/Button'
import Badge from './components/Badge'
import Icon from './components/Icon'
import EmptyState from './components/EmptyState'
import ConfirmDialog from './components/ConfirmDialog'
import Spinner from './components/Spinner'
import AssetForm from './forms/AssetForm'
import InstallPrompt from './components/InstallPrompt'
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

function assetStatus(tasks, currentKm) {
  const scores = tasks.flatMap(t => {
    if (t.interval_type === 'km') {
      if (t.next_due_km == null || currentKm == null) return []
      return [{ type: 'km', val: t.next_due_km - currentKm }]
    }
    const d = daysUntil(t.fixed_due_date ?? t.next_due)
    return d !== null ? [{ type: 'days', val: d }] : []
  })
  if (scores.length === 0) return { variant: 'neutral', text: 'Ingen oppgaver' }
  const worst = scores.reduce((a, b) => a.val < b.val ? a : b)
  const { type, val } = worst
  if (type === 'km') {
    if (val <= 0)    return { variant: 'danger',  text: `Forfalt ${(-val).toLocaleString('nb-NO')} km` }
    if (val <= 500)  return { variant: 'warning', text: `Om ${val.toLocaleString('nb-NO')} km` }
    return                  { variant: 'success', text: `Om ${val.toLocaleString('nb-NO')} km` }
  }
  if (val < 0)  return { variant: 'danger',  text: `Forfalt ${-val}d` }
  if (val === 0) return { variant: 'warning', text: 'Forfaller i dag' }
  if (val <= 30) return { variant: 'warning', text: `Om ${val}d` }
  return { variant: 'success', text: `Om ${val}d` }
}

export default function Home() {
  const navigate = useNavigate()
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [assets, setAssets]         = useState([])
  const [doneCount, setDoneCount]   = useState(0)
  const [doneAssetIds, setDoneAssetIds] = useState(new Set())
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filter, setFilter]         = useState('')
  const [statFilter, setStatFilter] = useState(null) // null | 'overdue' | 'soon' | 'done'
  const [editing, setEditing]       = useState(null)
  const [markingId, setMarkingId]   = useState(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const start = new Date()
    start.setDate(1)
    start.setHours(0, 0, 0, 0)

    const startStr = start.toISOString().slice(0, 10)
    const [{ data }, { count }, { data: kmRows }, { data: doneRows }] = await Promise.all([
      supabase
        .from('assets')
        .select('id, name, category, description, image_url, tasks(id, title, next_due, fixed_due_date, interval_type, next_due_km)')
        .is('deleted_at', null)
        .order('name'),
      supabase
        .from('maintenance_logs')
        .select('id', { count: 'exact', head: true })
        .gte('performed_on', startStr),
      // Latest km reading per asset (used to evaluate km-based task urgency)
      supabase
        .from('maintenance_logs')
        .select('asset_id, km_reading, performed_on')
        .not('km_reading', 'is', null)
        .order('performed_on', { ascending: false }),
      // Asset IDs with at least one log this month (for stat filter)
      supabase
        .from('maintenance_logs')
        .select('asset_id')
        .gte('performed_on', startStr),
    ])

    // Build map: assetId → highest km_reading seen (most recent odometer value)
    const latestKm = new Map()
    for (const row of kmRows ?? []) {
      if (!latestKm.has(row.asset_id)) latestKm.set(row.asset_id, row.km_reading)
    }

    setAssets((data ?? []).map(a => ({ ...a, currentKm: latestKm.get(a.id) ?? null })))
    setDoneCount(count ?? 0)
    setDoneAssetIds(new Set((doneRows ?? []).map(r => r.asset_id)))
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
        if (t.interval_type === 'km') {
          if (t.next_due_km == null || a.currentKm == null) continue
          const diff = t.next_due_km - a.currentKm
          if (diff <= 0)    overdue++
          else if (diff <= 500) soon++
        } else {
          const d = daysUntil(t.fixed_due_date ?? t.next_due)
          if (d === null) continue
          if (d < 0) overdue++
          else if (d <= 7) soon++
        }
      }
    }
    return { total: assets.length, overdue, soon }
  }, [assets])

  const attentionTasks = useMemo(() => {
    const items = []
    for (const a of assets) {
      for (const t of a.tasks ?? []) {
        if (t.interval_type === 'km') {
          if (t.next_due_km == null || a.currentKm == null) continue
          const diff = t.next_due_km - a.currentKm
          if (diff <= 500) {  // within 500 km counts as "attention"
            items.push({
              ...t,
              assetId: a.id, assetName: a.name, assetCategory: a.category,
              d: null, kmDiff: diff,
            })
          }
        } else {
          const due = t.fixed_due_date ?? t.next_due
          const d   = daysUntil(due)
          if (d !== null && d <= 7) {
            items.push({ ...t, assetId: a.id, assetName: a.name, assetCategory: a.category, d, kmDiff: null })
          }
        }
      }
    }
    // Sort: overdue km first, then overdue days, then upcoming
    return items.sort((a, b) => {
      const scoreA = a.kmDiff != null ? (a.kmDiff <= 0 ? -9999 : a.kmDiff) : a.d
      const scoreB = b.kmDiff != null ? (b.kmDiff <= 0 ? -9999 : b.kmDiff) : b.d
      return scoreA - scoreB
    })
  }, [assets])

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    return assets.filter(a => {
      if (filter && a.category !== filter) return false

      // Stat tile filter
      if (statFilter === 'overdue') {
        const hasOverdue = (a.tasks ?? []).some(t => {
          if (t.interval_type === 'km') return t.next_due_km != null && a.currentKm != null && t.next_due_km - a.currentKm <= 0
          const d = daysUntil(t.fixed_due_date ?? t.next_due)
          return d !== null && d < 0
        })
        if (!hasOverdue) return false
      } else if (statFilter === 'soon') {
        const hasSoon = (a.tasks ?? []).some(t => {
          if (t.interval_type === 'km') {
            if (t.next_due_km == null || a.currentKm == null) return false
            const diff = t.next_due_km - a.currentKm
            return diff > 0 && diff <= 500
          }
          const d = daysUntil(t.fixed_due_date ?? t.next_due)
          return d !== null && d >= 0 && d <= 7
        })
        if (!hasSoon) return false
      } else if (statFilter === 'done') {
        if (!doneAssetIds.has(a.id)) return false
      }

      if (!s) return true
      return (
        a.name.toLowerCase().includes(s) ||
        (a.description || '').toLowerCase().includes(s) ||
        (a.category || '').toLowerCase().includes(s)
      )
    })
  }, [assets, search, filter, statFilter, doneAssetIds])

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <Spinner size="md" />
    </div>
  )

  return (
    <div>
      {/* ── Install banner (shown once to non-installed users) ── */}
      <InstallPrompt />

      {/* ── Top bar ── */}
      <header className="home-topbar">
        <div className="home-brand">
          <div className="home-logo"><Icon name="wrench" size={20} /></div>
          <span className="home-brand-name">Maintain</span>
        </div>
        <nav className="home-topbar-nav">
          <button type="button" className="topbar-nav-btn" onClick={() => navigate('/templates')}>
            <Icon name="search" size={16} /><span className="nav-label">Bibliotek</span>
          </button>
          <button type="button" className="topbar-nav-btn" onClick={() => navigate('/settings')}>
            <Icon name="settings" size={16} /><span className="nav-label">Innstillinger</span>
          </button>
          <button type="button" className="topbar-nav-btn topbar-nav-btn--muted" onClick={() => setConfirmLogout(true)}>
            <Icon name="logout" size={16} /><span className="nav-label">Logg ut</span>
          </button>
        </nav>
      </header>

      <div className="container home-content">

        {/* ── Stats ── */}
        <div className="home-stats">
          <div
            className={`stat-card${statFilter === null ? ' stat-card--active' : ''}`}
            onClick={() => setStatFilter(null)}
            role="button" tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && setStatFilter(null)}
            title="Vis alle eiendeler"
          >
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Eiendeler</span>
          </div>
          <div
            className={`stat-card${stats.overdue > 0 ? ' stat-card--danger' : ''}${statFilter === 'overdue' ? ' stat-card--active' : ''}`}
            onClick={() => setStatFilter(f => f === 'overdue' ? null : 'overdue')}
            role="button" tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && setStatFilter(f => f === 'overdue' ? null : 'overdue')}
            title="Vis eiendeler med forfalte oppgaver"
          >
            <span className="stat-value">{stats.overdue}</span>
            <span className="stat-label">Forfalt</span>
          </div>
          <div
            className={`stat-card${stats.soon > 0 ? ' stat-card--warning' : ''}${statFilter === 'soon' ? ' stat-card--active' : ''}`}
            onClick={() => setStatFilter(f => f === 'soon' ? null : 'soon')}
            role="button" tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && setStatFilter(f => f === 'soon' ? null : 'soon')}
            title="Vis eiendeler med oppgaver som forfaller snart"
          >
            <span className="stat-value">{stats.soon}</span>
            <span className="stat-label">Forfaller snart</span>
          </div>
          <div
            className={`stat-card${doneCount > 0 ? ' stat-card--success' : ''}${statFilter === 'done' ? ' stat-card--active' : ''}`}
            onClick={() => setStatFilter(f => f === 'done' ? null : 'done')}
            role="button" tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && setStatFilter(f => f === 'done' ? null : 'done')}
            title="Vis eiendeler med fullførte oppgaver denne måneden"
          >
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
                const badge = task.kmDiff != null
                  ? task.kmDiff <= 0
                    ? { variant: 'danger',  text: `Forfalt ${(-task.kmDiff).toLocaleString('nb-NO')} km` }
                    : { variant: 'warning', text: `Om ${task.kmDiff.toLocaleString('nb-NO')} km` }
                  : task.d < 0
                  ? { variant: 'danger',  text: `Forfalt ${-task.d}d` }
                  : task.d === 0
                  ? { variant: 'warning', text: 'I dag' }
                  : { variant: 'warning', text: `Om ${task.d}d` }
                return (
                  <div
                    key={task.id}
                    className={`attention-row${i > 0 ? ' attention-row--border' : ''}`}
                  >
                    <button
                      className="attention-row-body"
                      onClick={() => navigate('/assets/' + task.assetId)}
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
            <h2>
              {statFilter === 'overdue' ? 'Forfalte eiendeler'
                : statFilter === 'soon' ? 'Forfaller snart'
                : statFilter === 'done' ? 'Fullført denne måneden'
                : 'Mine eiendeler'}
            </h2>
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
                const s = assetStatus(a.tasks ?? [], a.currentKm)
                const count = (a.tasks ?? []).length
                return (
                  <Card
                    key={a.id}
                    className="asset-card"
                    onClick={() => navigate('/assets/' + a.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter') navigate('/assets/' + a.id) }}
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

      <ConfirmDialog
        open={confirmLogout}
        title="Logg ut"
        message="Er du sikker på at du vil logge ut?"
        confirmLabel="Logg ut"
        onConfirm={() => { setConfirmLogout(false); supabase.auth.signOut() }}
        onClose={() => setConfirmLogout(false)}
      />
    </div>
  )
}
