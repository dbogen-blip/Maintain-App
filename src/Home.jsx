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
import { formatDate } from './lib/format'
import './Home.css'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

// Runs on app open: finds pending EU-kontroll refresh jobs for the current user
// (inserted when they mark an EU-kontroll task as done), fetches the new date
// from Vegvesenet, and updates the task. Only fires for active users since it
// requires the app to be open.
async function processEuRefresh() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: jobs } = await supabase
    .from('vehicle_eu_refresh')
    .select('*')
    .eq('user_id', user.id)
    .is('processed_at', null)
    .lte('refresh_after', new Date().toISOString())

  if (!jobs?.length) return

  for (const job of jobs) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/lookup-vehicle?regnr=${encodeURIComponent(job.regnr)}`
      )
      const data = await res.json()
      if (!res.ok || data.error || !data.eu_date) continue

      const { data: euTask } = await supabase
        .from('tasks')
        .select('id')
        .eq('asset_id', job.asset_id)
        .ilike('title', 'EU-kontroll')
        .is('deleted_at', null)
        .maybeSingle()

      const today = formatDate(new Date())
      if (euTask?.id) {
        await supabase.from('tasks').update({
          fixed_due_date: data.eu_date,
          description:    `Forfallsdato automatisk oppdatert fra Statens vegvesen ${today}.`,
        }).eq('id', euTask.id)
      } else {
        await supabase.from('tasks').insert({
          asset_id:       job.asset_id,
          title:          'EU-kontroll',
          fixed_due_date: data.eu_date,
          description:    `Forfallsdato automatisk oppdatert fra Statens vegvesen ${today}.`,
          priority:       1,
        })
      }

      await supabase
        .from('vehicle_eu_refresh')
        .update({ processed_at: new Date().toISOString() })
        .eq('id', job.id)
    } catch (e) {
      console.warn('EU-refresh feilet for', job.regnr, e)
    }
  }
}

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
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filter, setFilter]         = useState('')
  const [editing, setEditing]       = useState(null)
  const [markingId, setMarkingId]   = useState(null)

  useEffect(() => { fetchAll(); processEuRefresh() }, [])

  async function fetchAll() {
    setLoading(true)

    const [{ data }, { data: kmRows }] = await Promise.all([
      supabase
        .from('assets')
        .select('id, name, category, description, image_url, regnr, tasks(id, title, next_due, fixed_due_date, interval_type, next_due_km)')
        .is('deleted_at', null)
        .order('name'),
      // Latest km reading per asset (used to evaluate km-based task urgency)
      supabase
        .from('maintenance_logs')
        .select('asset_id, km_reading, performed_on')
        .not('km_reading', 'is', null)
        .order('performed_on', { ascending: false }),
    ])

    // Build map: assetId → highest km_reading seen (most recent odometer value)
    const latestKm = new Map()
    for (const row of kmRows ?? []) {
      if (!latestKm.has(row.asset_id)) latestKm.set(row.asset_id, row.km_reading)
    }

    setAssets((data ?? []).map(a => ({ ...a, currentKm: latestKm.get(a.id) ?? null })))
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

    // If this is an EU-kontroll task and the asset has a regnr, schedule refresh
    const isEu = task.title?.toLowerCase().includes('eu-kontroll')
    const parentAsset = assets.find(a => a.id === task.assetId)
    if (isEu && parentAsset?.regnr) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const refreshAfter = new Date()
        refreshAfter.setMonth(refreshAfter.getMonth() + 6)
        await supabase.from('vehicle_eu_refresh').delete()
          .eq('asset_id', task.assetId).is('processed_at', null)
        await supabase.from('vehicle_eu_refresh').insert({
          asset_id:      task.assetId,
          user_id:       user.id,
          regnr:         parentAsset.regnr,
          refresh_after: refreshAfter.toISOString(),
        })
      }
    }

    fetchAll()
  }

  const categories = useMemo(() => {
    const set = new Set()
    for (const a of assets) if (a.category) set.add(a.category)
    return [...set].sort()
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
