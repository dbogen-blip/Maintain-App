// Detail view for a single asset. Shows all tasks and their maintenance history.
// Data model: assets → tasks → maintenance_logs, each level with optional
// file attachments stored in the 'asset-images' bucket.
// taskGroups memo splits tasks into overdue / soon (≤14 days) / later /
// unplanned buckets so the most urgent work is always visible first.
// fixed_due_date takes precedence over next_due for all due-date display and
// sorting — interval tasks and calendar tasks are handled uniformly via the
// expression (fixed_due_date ?? next_due).
// CarTaskPicker and HouseTaskPicker are category-specific preset pickers that
// bulk-insert common tasks from a curated list.
import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import { publicUrl, isImage } from './storage'
import { categoryImgProps } from './categoryImages'
import { formatNok, formatKm, formatDate } from './lib/format'
import Card from './components/Card'
import Button from './components/Button'
import Badge from './components/Badge'
import Icon from './components/Icon'
import EmptyState from './components/EmptyState'
import Spinner from './components/Spinner'
import AssetForm from './forms/AssetForm'
import TaskForm from './forms/TaskForm'
import LogForm from './forms/LogForm'
import PublishModal from './forms/PublishModal'
import HouseTaskPicker from './HouseTaskPicker'
import CarTaskPicker from './CarTaskPicker'
import TrailerTaskPicker from './TrailerTaskPicker'
import { getTemplateForAsset } from './templates'
import ConfirmDialog from './components/ConfirmDialog'
import Toast from './components/Toast'
import './AssetDetail.css'

function daysUntil(dateStr) {
  if (!dateStr) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.round((target - today) / 86400000)
}

function dueBadge(task, currentKm = null) {
  // km-based task
  if (task.interval_type === 'km') {
    if (task.next_due_km == null) return { variant: 'neutral', text: 'Ikke utført' }
    if (currentKm == null)        return { variant: 'neutral', text: `Forfaller ved ${task.next_due_km.toLocaleString('nb-NO')} km` }
    const diff = task.next_due_km - currentKm
    if (diff <= 0)    return { variant: 'danger',  text: `Forfalt med ${(-diff).toLocaleString('nb-NO')} km` }
    if (diff <= 500)  return { variant: 'warning', text: `Om ${diff.toLocaleString('nb-NO')} km` }
    return                       { variant: 'success', text: `Om ${diff.toLocaleString('nb-NO')} km` }
  }
  // date-based task
  const effectiveDue = task.fixed_due_date ?? task.next_due
  if (!effectiveDue) return { variant: 'neutral', text: 'Ikke utført' }
  const d = daysUntil(effectiveDue)
  if (d < 0)  return { variant: 'danger',  text: `Forfalt ${-d}d` }
  if (d === 0) return { variant: 'warning', text: 'I dag' }
  if (d <= 7)  return { variant: 'warning', text: `Om ${d}d` }
  return { variant: 'success', text: `Om ${d}d` }
}

function priorityLabel(p) {
  return p === 1 ? 'Høy' : p === 3 ? 'Lav' : 'Normal'
}

export default function AssetDetail() {
  const { id: assetId } = useParams()
  const navigate = useNavigate()
  const [asset, setAsset]                   = useState(null)
  const [tasks, setTasks]                   = useState([])
  const [loading, setLoading]               = useState(true)
  const [editAsset, setEditAsset]           = useState(false)
  const [editTask, setEditTask]             = useState(null)
  const [logTask, setLogTask]               = useState(null)
  const [expanded, setExpanded]             = useState({})
  const [showPublish, setShowPublish]       = useState(false)
  const [publishedTemplate, setPublishedTemplate] = useState(null)
  const [showHousePicker, setShowHousePicker]     = useState(false)
  const [confirmDeleteTask, setConfirmDeleteTask] = useState(null)  // task object | null
  const [confirmDeleteAsset, setConfirmDeleteAsset] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [descExpanded, setDescExpanded] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => { load() }, [assetId])

  // Latest odometer reading across all task logs for this asset
  const currentKm = useMemo(() => {
    let max = null
    for (const t of tasks) {
      for (const l of t.maintenance_logs ?? []) {
        if (l.km_reading != null && (max === null || l.km_reading > max)) max = l.km_reading
      }
    }
    return max
  }, [tasks])

  const taskGroups = useMemo(() => {
    const overdue = [], soon = [], later = [], unplanned = [], done = []
    for (const t of tasks) {
      // A fixed-date task with last_done set has been completed — move it to
      // the "Utforte" group regardless of whether the due date has passed.
      if (t.fixed_due_date && t.last_done) {
        done.push(t)
        continue
      }

      if (t.interval_type === 'km') {
        if (t.next_due_km == null) { unplanned.push(t); continue }
        const diff = currentKm != null ? t.next_due_km - currentKm : null
        if (diff === null)   { unplanned.push(t); continue }
        if (diff <= 0)        overdue.push(t)
        else if (diff <= 500) soon.push(t)
        else                  later.push(t)
        continue
      }

      const due = t.fixed_due_date ?? t.next_due
      const d   = due ? daysUntil(due) : null
      if (d === null)   unplanned.push(t)
      else if (d < 0)   overdue.push(t)
      else if (d <= 14) soon.push(t)
      else              later.push(t)
    }
    return [
      { id: 'overdue',   label: 'Forfalt',                       variant: 'danger',  tasks: overdue,   isDone: false },
      { id: 'soon',      label: 'Forfaller snart',               variant: 'warning', tasks: soon,      isDone: false },
      { id: 'later',     label: 'Kommende',                      variant: 'success', tasks: later,     isDone: false },
      { id: 'unplanned', label: 'Ikke planlagt',                 variant: 'neutral', tasks: unplanned, isDone: false },
      { id: 'done',      label: 'Utforte vedlikeholdsoppgaver',  variant: 'neutral', tasks: done,      isDone: true  },
    ].filter(g => g.tasks.length > 0)
  }, [tasks, currentKm])

  // ── Hero stat computations ───────────────────────────────────────────
  const heroStatus = useMemo(() => {
    const overdueG = taskGroups.find(g => g.id === 'overdue')
    const soonG    = taskGroups.find(g => g.id === 'soon')
    const active   = tasks.filter(t => !(t.fixed_due_date && t.last_done))
    if (overdueG?.tasks.length > 0) {
      const n = overdueG.tasks.length
      return { level: 'danger',  label: n === 1 ? '1 forfalt' : `${n} forfalt`,
               sub: 'Krever oppmerksomhet', icon: 'alertCircle' }
    }
    if (soonG?.tasks.length > 0) {
      const n = soonG.tasks.length
      return { level: 'warning', label: n === 1 ? '1 forfaller snart' : `${n} forfaller snart`,
               sub: 'Innen 14 dager', icon: 'clock' }
    }
    if (active.length === 0) {
      return { level: 'neutral', label: 'Ingen oppgaver', sub: 'Legg til oppgaver', icon: 'list' }
    }
    return { level: 'success', label: 'Alt OK', sub: 'Ingen oppgaver forfalt', icon: 'check' }
  }, [taskGroups, tasks])

  const nextTaskInfo = useMemo(() => {
    const active = tasks.filter(t => !(t.fixed_due_date && t.last_done) && t.interval_type !== 'km')
    let best = null, bestDue = null
    for (const t of active) {
      const due = t.fixed_due_date ?? t.next_due
      if (!due) continue
      if (!bestDue || due < bestDue) { best = t; bestDue = due }
    }
    if (!best) return null
    const d = daysUntil(bestDue)
    const when = d < 0 ? `Forfalt for ${-d} dag${-d !== 1 ? 'er' : ''} siden`
               : d === 0 ? 'I dag'
               : d === 1 ? 'I morgen'
               : `om ${d} dager`
    return { task: best, days: d, when }
  }, [tasks])

  const loggedTasksCount = useMemo(() =>
    tasks.filter(t => (t.maintenance_logs?.length ?? 0) > 0).length
  , [tasks])

  const euTask = useMemo(() =>
    tasks.find(t =>
      t.title?.toLowerCase().includes('eu-kontroll') &&
      t.fixed_due_date && !(t.fixed_due_date && t.last_done)
    )
  , [tasks])
  // ─────────────────────────────────────────────────────────────────────

  async function load() {
    setLoading(true)
    setLoadError(null)
    try {
      const [{ data: a, error: aErr }, { data: t, error: tErr }, tpl] = await Promise.all([
        supabase.from('assets').select('*').eq('id', assetId).single(),
        supabase
          .from('tasks')
          .select(`
            *,
            attachments:task_attachments(id, file_path, file_name, mime_type, size_bytes),
            maintenance_logs (
              id, performed_on, notes, cost, km_reading, skipped,
              attachments:maintenance_log_attachments(id, file_path, file_name, mime_type, size_bytes)
            )
          `)
          .eq('asset_id', assetId)
          .is('deleted_at', null)
          .order('next_due', { ascending: true, nullsFirst: false }),
        getTemplateForAsset(assetId),
      ])
      if (aErr) throw aErr
      if (tErr) throw tErr
      setAsset(a)
      setPublishedTemplate(tpl)
      const sorted = (t ?? [])
        .map(task => ({
          ...task,
          maintenance_logs: (task.maintenance_logs ?? [])
            .sort((x, y) => y.performed_on.localeCompare(x.performed_on)),
        }))
        .sort((a, b) => {
          const da = a.fixed_due_date ?? a.next_due
          const db = b.fixed_due_date ?? b.next_due
          if (!da && !db) return 0
          if (!da) return 1
          if (!db) return -1
          return da.localeCompare(db)
        })
      setTasks(sorted)
    } catch (e) {
      console.error('AssetDetail load feilet:', e)
      setLoadError(e.message ?? 'Kunne ikke laste eiendel')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogSaved(task) {
    load()
    const isEu = task?.title?.toLowerCase().includes('eu-kontroll')
    if (isEu && asset?.regnr) {
      // Schedule a Vegvesenet refresh 6 months from now
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const refreshAfter = new Date()
        refreshAfter.setMonth(refreshAfter.getMonth() + 6)
        // Delete any existing pending job for this asset (partial unique index),
        // then insert new one
        await supabase.from('vehicle_eu_refresh')
          .delete()
          .eq('asset_id', assetId)
          .is('processed_at', null)
        await supabase.from('vehicle_eu_refresh').insert({
          asset_id:     assetId,
          user_id:      user.id,
          regnr:        asset.regnr,
          refresh_after: refreshAfter.toISOString(),
        })
      }
      setToast({
        message: 'EU-kontroll registrert! Ny forfallsdato hentes automatisk fra Statens vegvesen om 6 måneder.',
      })
    }
  }

  async function deleteTask(task) {
    const now = new Date().toISOString()
    await supabase.from('tasks').update({ deleted_at: now }).eq('id', task.id)
    setConfirmDeleteTask(null)
    load()
    setToast({
      message: `«${task.title}» er slettet`,
      undo: async () => {
        await supabase.from('tasks').update({ deleted_at: null }).eq('id', task.id)
        load()
      },
    })
  }

  async function deleteAsset() {
    const now = new Date().toISOString()
    await supabase.from('assets').update({ deleted_at: now }).eq('id', assetId)
    navigate('/')
  }

  function renderTask(task, isDone = false) {
    const badge  = isDone
      ? { variant: 'success', text: `Utfort ${formatDate(task.last_done)}` }
      : dueBadge(task, currentKm)
    const isOpen = expanded[task.id]
    return (
      <Card key={task.id} className="task-card" padding={4}>
        <div
          className="task-head"
          onClick={() => setExpanded(e => ({ ...e, [task.id]: !e[task.id] }))}
          style={{ cursor: 'pointer' }}
        >
          <div className="task-toggle" aria-hidden="true">
            <Icon name={isOpen ? 'chevronDown' : 'chevronRight'} size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              <h3 style={{ margin: 0 }}>{task.title}</h3>
              <Badge variant={badge.variant}>{badge.text}</Badge>
            </div>
            <div className="task-meta">
              {task.interval_type === 'km' ? (
                <>
                  <span><Icon name="car" size={14} /> Hver {task.interval_km?.toLocaleString('nb-NO')} km</span>
                  <span><Icon name="clock" size={14} /> Sist ved: {task.last_done_km != null ? task.last_done_km.toLocaleString('nb-NO') + ' km' : 'aldri'}</span>
                </>
              ) : task.fixed_due_date ? (
                <>
                  <span><Icon name="calendar" size={14} /> {isDone ? 'Var planlagt' : 'Fast dato'}: {formatDate(task.fixed_due_date)}</span>
                  {task.repeat_after_years && (
                    <span><Icon name="refresh" size={14} /> Gjentar hvert {task.repeat_after_years}. år</span>
                  )}
                </>
              ) : task.interval_days ? (
                <>
                  <span><Icon name="calendar" size={14} /> Neste: {formatDate(task.next_due) ?? '—'}</span>
                  <span><Icon name="refresh" size={14} /> Hver {task.interval_days} dag{task.interval_days !== 1 ? 'er' : ''}</span>
                </>
              ) : null}
              {task.priority !== 2 && <span>Prioritet: {priorityLabel(task.priority)}</span>}
              {task.maintenance_logs?.length > 0 && (
                <span><Icon name="history" size={14} /> {task.maintenance_logs.length} ganger utfort</span>
              )}
            </div>
          </div>
        </div>

        {isOpen && (
          <div className="task-body">
            {task.description && (
              <div className="task-section">
                <h4>Slik utfører du</h4>
                <p style={{ whiteSpace: 'pre-wrap', color: 'var(--color-text-muted)' }}>{task.description}</p>
              </div>
            )}

            {task.attachments?.length > 0 && (
              <div className="task-section">
                <h4>Vedlegg</h4>
                <ul className="att-list">
                  {task.attachments.map(att => (
                    <li key={att.id} className="att-item">
                      {isImage(att.mime_type) ? (
                        <a href={publicUrl(att.file_path)} target="_blank" rel="noreferrer">
                          <img src={publicUrl(att.file_path)} alt={att.file_name} />
                        </a>
                      ) : (
                        <a href={publicUrl(att.file_path)} target="_blank" rel="noreferrer" className="att-doc">
                          <Icon name="image" size={16} /> {att.file_name}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {task.notes && (
              <div className="task-section">
                <h4>Utstyr til vedlikehold</h4>
                <p style={{ whiteSpace: 'pre-wrap', color: 'var(--color-text-muted)' }}>{task.notes}</p>
              </div>
            )}

            {task.tips && (
              <div className="task-section">
                <h4>Kjekt å ha</h4>
                <p style={{ whiteSpace: 'pre-wrap', color: 'var(--color-text-muted)' }}>{task.tips}</p>
              </div>
            )}

            {task.maintenance_logs?.length > 0 && (
              <div className="task-section">
                <h4>Historikk</h4>
                <ul className="log-list">
                  {task.maintenance_logs.map(log => (
                    <li key={log.id} className={`log-item${log.skipped ? ' log-item--skipped' : ''}`}>
                      <div className="row" style={{ justifyContent: 'space-between' }}>
                        <strong style={{ color: log.skipped ? 'var(--color-text-muted)' : undefined }}>
                          {formatDate(log.performed_on)}
                        </strong>
                        <span className="muted" style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
                          {log.skipped && (
                            <span style={{
                              fontSize: 'var(--font-size-xs)',
                              background: '#fffbeb',
                              color: '#b45309',
                              border: '1px solid #fde68a',
                              borderRadius: 'var(--radius-full)',
                              padding: '1px 8px',
                              fontWeight: 'var(--font-weight-medium)',
                            }}>Utsatt</span>
                          )}
                          {log.km_reading != null && <span>{formatKm(log.km_reading)}</span>}
                          {log.cost != null && <span>{formatNok(log.cost)}</span>}
                        </span>
                      </div>
                      {log.notes && <p style={{ margin: 'var(--space-1) 0 0', color: 'var(--color-text-muted)' }}>{log.notes}</p>}
                      {log.attachments?.length > 0 && (
                        <ul className="att-list" style={{ marginTop: 'var(--space-2)' }}>
                          {log.attachments.map(att => (
                            <li key={att.id} className="att-item">
                              {isImage(att.mime_type) ? (
                                <a href={publicUrl(att.file_path)} target="_blank" rel="noreferrer">
                                  <img src={publicUrl(att.file_path)} alt={att.file_name} />
                                </a>
                              ) : (
                                <a href={publicUrl(att.file_path)} target="_blank" rel="noreferrer" className="att-doc">
                                  <Icon name="image" size={16} /> {att.file_name}
                                </a>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="row" style={{ marginTop: 'var(--space-4)', flexWrap: 'wrap' }}>
              {!isDone && (
                <Button icon="check" onClick={() => setLogTask(task)}>Marker som utført</Button>
              )}
              <Button variant="secondary" icon="edit" onClick={() => setEditTask(task)}>Rediger</Button>
              <Button variant="danger" icon="trash" size="sm" onClick={() => setConfirmDeleteTask(task)}>Slett</Button>
            </div>
          </div>
        )}
      </Card>
    )
  }

  if (loading) return (
    <div className="container" style={{ display: 'flex', justifyContent: 'center', paddingTop: 'var(--space-8)' }}>
      <Spinner size="md" />
    </div>
  )
  if (loadError) return (
    <div className="container" style={{ paddingTop: 'var(--space-8)' }}>
      <EmptyState
        icon="wrench"
        title="Noe gikk galt"
        description={loadError}
        action={
          <div className="row">
            <Button onClick={load}>Prøv igjen</Button>
            <Button variant="ghost" icon="arrowLeft" onClick={() => navigate('/')}>Tilbake</Button>
          </div>
        }
      />
    </div>
  )
  if (!asset) return (
    <div className="container">
      <EmptyState title="Fant ikke eiendelen" action={<Button onClick={() => navigate('/')}>Tilbake</Button>} />
    </div>
  )

  return (
    <div className="container">
      <Button variant="ghost" icon="arrowLeft" onClick={() => navigate(-1)}>Tilbake</Button>

      <Card className="detail-hero" padding={0}>
        {/* ── Top: image | name+badges+tiles | stacked actions ── */}
        <div className="detail-hero-top">
          <div className="detail-hero-image">
            {asset.image_url
              ? <img src={asset.image_url} alt="" />
              : <img {...categoryImgProps(asset.category)} alt="" />}
          </div>

          <div className="detail-hero-meta">
            <h1>{asset.name}</h1>
            <div className="detail-hero-badges">
              {asset.category    && <Badge>{asset.category}</Badge>}
              {asset.purchased_at && <Badge variant="neutral">Kjøpt {formatDate(asset.purchased_at)}</Badge>}
              {asset.postal_code  && <Badge variant="neutral"><Icon name="map-pin" size={11} /> {asset.postal_code}</Badge>}
            </div>

            {/* Stat tiles */}
            <div className="detail-stat-tiles">
              {/* Status */}
              <div className={`detail-stat-tile detail-stat-tile--${heroStatus.level}`}>
                <div className="detail-stat-tile-label">
                  <Icon name={heroStatus.icon} size={13} />
                  <span>Status</span>
                </div>
                <strong className="detail-stat-tile-value">{heroStatus.label}</strong>
                <span className="detail-stat-tile-sub">{heroStatus.sub}</span>
              </div>

              {/* Next task */}
              <div className={`detail-stat-tile detail-stat-tile--${
                nextTaskInfo
                  ? nextTaskInfo.days < 0 ? 'danger'
                  : nextTaskInfo.days <= 14 ? 'warning'
                  : 'warning'
                  : 'neutral'
              }`}>
                <div className="detail-stat-tile-label">
                  <Icon name="clock" size={13} />
                  <span>Neste oppgave</span>
                </div>
                <strong className="detail-stat-tile-value">
                  {nextTaskInfo ? nextTaskInfo.task.title : 'Ingen'}
                </strong>
                <span className="detail-stat-tile-sub">
                  {nextTaskInfo ? nextTaskInfo.when : 'Ingen planlagte'}
                </span>
              </div>

              {/* Tasks count */}
              <div className="detail-stat-tile detail-stat-tile--neutral">
                <div className="detail-stat-tile-label">
                  <Icon name="list" size={13} />
                  <span>Oppgaver</span>
                </div>
                <strong className="detail-stat-tile-value">{tasks.length}</strong>
                <span className="detail-stat-tile-sub">
                  {loggedTasksCount > 0 ? `${loggedTasksCount} fullført` : 'ingen utført'}
                </span>
              </div>
            </div>
          </div>

          <div className="detail-hero-actions">
            <Button size="sm" variant="secondary" icon="printer" onClick={() => navigate(`/assets/${assetId}/export`)}>
              Historikk
            </Button>
            <Button size="sm" variant="secondary" icon={publishedTemplate ? 'check' : 'upload'} onClick={() => setShowPublish(true)}>
              {publishedTemplate ? 'Publisert' : 'Publiser'}
            </Button>
            <Button size="sm" variant="secondary" icon="edit" onClick={() => setEditAsset(true)}>
              Rediger
            </Button>
            <Button size="sm" variant="danger" icon="trash" onClick={() => setConfirmDeleteAsset(true)}>
              Slett
            </Button>
          </div>
        </div>

        {/* ── Description row ── */}
        {asset.description && (
          <div className="detail-hero-desc-row">
            <p className={`detail-hero-desc${descExpanded ? ' desc-expanded' : ''}`}>
              {asset.description}
            </p>
            <div className="detail-hero-desc-footer">
              {asset.description.length > 160 && (
                <button
                  type="button"
                  className="detail-hero-vis-mer"
                  onClick={() => setDescExpanded(v => !v)}
                >
                  {descExpanded ? 'Vis mindre ↑' : 'Vis mer ↓'}
                </button>
              )}
              {euTask && (
                <span className="detail-eu-frist">
                  EU-kontroll frist: {formatDate(euTask.fixed_due_date)}
                </span>
              )}
            </div>
          </div>
        )}
      </Card>

      <div className="task-section-header" style={{ margin: 'var(--space-6) 0 var(--space-3)', alignItems: 'center' }}>
        <h2>Vedlikeholdsoppgaver</h2>
        <div className="row">
          {asset.category === 'Hus' && (
            <Button variant="secondary" icon="home" onClick={() => setShowHousePicker(true)}>
              Vedlikeholdskalender
            </Button>
          )}
          {(asset.category === 'Bil' || asset.category === 'MC/ATV') && (
            <Button variant="secondary" icon="car" onClick={() => setShowHousePicker(true)}>
              Vedlikeholdskalender
            </Button>
          )}
          {(asset.category === 'Tilhenger' || asset.category === 'Campingvogn') && (
            <Button variant="secondary" icon="list" onClick={() => setShowHousePicker(true)}>
              Vedlikeholdskalender
            </Button>
          )}
          <Button icon="plus" onClick={() => setEditTask({})}>Ny oppgave</Button>
        </div>
      </div>

      {tasks.length === 0 ? (
        asset.category === 'Hus' ? (
          <EmptyState
            icon="home"
            title="Ingen oppgaver enda"
            description="Legg til oppgaver fra norsk vedlikeholdskalender for hus, eller opprett egne."
            action={
              <div className="row" style={{ flexWrap: 'wrap' }}>
                <Button icon="home" onClick={() => setShowHousePicker(true)}>Legg til vedlikeholdskalender</Button>
                <Button variant="secondary" icon="plus" onClick={() => setEditTask({})}>Egendefinert oppgave</Button>
              </div>
            }
          />
        ) : (
          <EmptyState
            icon="list"
            title="Ingen oppgaver enda"
            description="Legg til den første vedlikeholdsoppgaven, så holder vi rede på når den forfaller."
            action={<Button icon="plus" onClick={() => setEditTask({})}>Legg til oppgave</Button>}
          />
        )
      ) : (
        <div className="task-list">
          {taskGroups.map(group => (
            <div key={group.id} className="task-group">
              <div className="task-group-header">
                <span className="task-group-label">{group.label}</span>
                <Badge variant={group.variant}>{group.tasks.length}</Badge>
              </div>
              {group.tasks.map(task => renderTask(task, group.isDone))}
            </div>
          ))}
        </div>
      )}

      {editAsset && <AssetForm asset={asset} onClose={() => setEditAsset(false)} onSaved={load} />}
      {editTask  && <TaskForm assetId={assetId} task={editTask.id ? editTask : null} assetCategory={asset?.category} onClose={() => setEditTask(null)} onSaved={load} />}
      {logTask && (
        <LogForm
          task={logTask}
          assetId={assetId}
          assetCategory={asset?.category}
          onClose={() => setLogTask(null)}
          onSaved={() => handleLogSaved(logTask)}
        />
      )}
      {showHousePicker && asset?.category === 'Hus' && (
        <HouseTaskPicker assetId={assetId} onClose={() => setShowHousePicker(false)} onSaved={load} />
      )}
      {showHousePicker && (asset?.category === 'Bil' || asset?.category === 'MC/ATV') && (
        <CarTaskPicker assetId={assetId} onClose={() => setShowHousePicker(false)} onSaved={load} />
      )}
      {showHousePicker && (asset?.category === 'Tilhenger' || asset?.category === 'Campingvogn') && (
        <TrailerTaskPicker assetId={assetId} onClose={() => setShowHousePicker(false)} onSaved={load} />
      )}
      {showPublish && (
        <PublishModal asset={asset} onClose={() => setShowPublish(false)} onPublished={load} />
      )}

      {/* Delete task confirmation */}
      <ConfirmDialog
        open={!!confirmDeleteTask}
        title="Slett oppgave"
        message={`«${confirmDeleteTask?.title}» flyttes til papirkurven. Du kan angre med Angre-knappen som dukker opp.`}
        confirmLabel="Slett"
        variant="danger"
        onConfirm={() => deleteTask(confirmDeleteTask)}
        onClose={() => setConfirmDeleteTask(null)}
      />

      {/* Delete asset confirmation */}
      <ConfirmDialog
        open={confirmDeleteAsset}
        title="Flytt til papirkurv"
        message={`«${asset?.name}» flyttes til papirkurven. Du kan gjenopprette den i Innstillinger innen 7 dager.`}
        confirmLabel="Slett"
        variant="danger"
        onConfirm={deleteAsset}
        onClose={() => setConfirmDeleteAsset(false)}
      />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}
