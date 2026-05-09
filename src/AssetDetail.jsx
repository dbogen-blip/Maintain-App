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
import { supabase } from './supabaseClient'
import { publicUrl, isImage } from './storage'
import { categoryImgProps } from './categoryImages'
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
import { getTemplateForAsset } from './templates'
import './AssetDetail.css'

function daysUntil(dateStr) {
  if (!dateStr) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.round((target - today) / 86400000)
}

function dueBadge(task) {
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

export default function AssetDetail({ assetId, onBack }) {
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

  useEffect(() => { load() }, [assetId])

  const taskGroups = useMemo(() => {
    const overdue = [], soon = [], later = [], unplanned = []
    for (const t of tasks) {
      const due = t.fixed_due_date ?? t.next_due
      const d   = due ? daysUntil(due) : null
      if (d === null)   unplanned.push(t)
      else if (d < 0)   overdue.push(t)
      else if (d <= 14) soon.push(t)
      else              later.push(t)
    }
    return [
      { id: 'overdue',   label: 'Forfalt',        variant: 'danger',  tasks: overdue   },
      { id: 'soon',      label: 'Forfaller snart', variant: 'warning', tasks: soon      },
      { id: 'later',     label: 'Kommende',        variant: 'success', tasks: later     },
      { id: 'unplanned', label: 'Ikke planlagt',   variant: 'neutral', tasks: unplanned },
    ].filter(g => g.tasks.length > 0)
  }, [tasks])

  async function load() {
    setLoading(true)
    const [{ data: a }, { data: t }, tpl] = await Promise.all([
      supabase.from('assets').select('*').eq('id', assetId).single(),
      supabase
        .from('tasks')
        .select(`
          *,
          attachments:task_attachments(id, file_path, file_name, mime_type, size_bytes),
          maintenance_logs (
            id, performed_on, notes, cost, km_reading,
            attachments:maintenance_log_attachments(id, file_path, file_name, mime_type, size_bytes)
          )
        `)
        .eq('asset_id', assetId)
        .order('next_due', { ascending: true, nullsFirst: false }),
      getTemplateForAsset(assetId),
    ])
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
    setLoading(false)
  }

  async function deleteTask(taskId) {
    if (!confirm('Slette oppgaven og all historikk?')) return
    await supabase.from('tasks').delete().eq('id', taskId)
    load()
  }

  async function deleteAsset() {
    if (!confirm('Slette eiendelen, alle oppgaver og historikk?')) return
    await supabase.from('assets').delete().eq('id', assetId)
    onBack()
  }

  function renderTask(task) {
    const badge  = dueBadge(task)
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
              {task.fixed_due_date
                ? <span><Icon name="calendar" size={14} /> Fast dato: {task.fixed_due_date}</span>
                : task.interval_days
                ? <span><Icon name="refresh" size={14} /> Hver {task.interval_days} dag</span>
                : null
              }
              {!task.fixed_due_date && <span><Icon name="clock" size={14} /> Sist: {task.last_done ?? 'aldri'}</span>}
              {task.priority !== 2 && <span>Prioritet: {priorityLabel(task.priority)}</span>}
              {task.maintenance_logs?.length > 0 && (
                <span><Icon name="history" size={14} /> {task.maintenance_logs.length} ganger utført</span>
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
                <h4>Notater</h4>
                <p style={{ whiteSpace: 'pre-wrap', color: 'var(--color-text-muted)' }}>{task.notes}</p>
              </div>
            )}

            {task.maintenance_logs?.length > 0 && (
              <div className="task-section">
                <h4>Historikk</h4>
                <ul className="log-list">
                  {task.maintenance_logs.map(log => (
                    <li key={log.id} className="log-item">
                      <div className="row" style={{ justifyContent: 'space-between' }}>
                        <strong>{log.performed_on}</strong>
                        <span className="muted" style={{ display: 'flex', gap: 'var(--space-3)' }}>
                          {log.km_reading != null && <span>{log.km_reading.toLocaleString('nb-NO')} km</span>}
                          {log.cost != null && <span>kr {log.cost}</span>}
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
              <Button icon="check" onClick={() => setLogTask(task)}>Marker som utført</Button>
              <Button variant="secondary" icon="edit" onClick={() => setEditTask(task)}>Rediger</Button>
              <Button variant="danger" icon="trash" size="sm" onClick={() => deleteTask(task.id)}>Slett</Button>
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
  if (!asset) return (
    <div className="container">
      <EmptyState title="Fant ikke eiendelen" action={<Button onClick={onBack}>Tilbake</Button>} />
    </div>
  )

  return (
    <div className="container">
      <Button variant="ghost" icon="arrowLeft" onClick={onBack}>Tilbake</Button>

      <Card className="detail-hero" padding={0}>
        <div className="detail-hero-image">
          {asset.image_url
            ? <img src={asset.image_url} alt="" />
            : <img {...categoryImgProps(asset.category)} alt="" />}
        </div>
        <div className="detail-hero-body">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
            <div style={{ minWidth: 0 }}>
              <h1 style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '30ch' }}>{asset.name}</h1>
              <div className="row" style={{ marginTop: 'var(--space-2)', flexWrap: 'wrap' }}>
                {asset.category && <Badge>{asset.category}</Badge>}
                {asset.purchased_at && <Badge variant="neutral">Kjøpt {asset.purchased_at}</Badge>}
              </div>
            </div>
            <div className="row asset-hero-actions" style={{ flexWrap: 'nowrap', flexShrink: 0 }}>
              <Button
                variant="secondary"
                icon={publishedTemplate ? 'check' : 'upload'}
                onClick={() => setShowPublish(true)}
              >
                <span className="asset-btn-label">{publishedTemplate ? 'Publisert' : 'Publiser'}</span>
              </Button>
              <Button variant="secondary" icon="edit" onClick={() => setEditAsset(true)}>
                <span className="asset-btn-label">Rediger</span>
              </Button>
              <Button variant="danger" icon="trash" onClick={deleteAsset}>
                <span className="asset-btn-label">Slett</span>
              </Button>
            </div>
          </div>
          {asset.description && (
            <p style={{ marginTop: 'var(--space-3)', color: 'var(--color-text-muted)' }}>{asset.description}</p>
          )}
        </div>
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
              {group.tasks.map(task => renderTask(task))}
            </div>
          ))}
        </div>
      )}

      {editAsset && <AssetForm asset={asset} onClose={() => setEditAsset(false)} onSaved={load} />}
      {editTask  && <TaskForm assetId={assetId} task={editTask.id ? editTask : null} onClose={() => setEditTask(null)} onSaved={load} />}
      {logTask && (
        <LogForm
          task={logTask}
          assetId={assetId}
          assetCategory={asset?.category}
          onClose={() => setLogTask(null)}
          onSaved={load}
        />
      )}
      {showHousePicker && asset?.category === 'Hus' && (
        <HouseTaskPicker assetId={assetId} onClose={() => setShowHousePicker(false)} onSaved={load} />
      )}
      {showHousePicker && (asset?.category === 'Bil' || asset?.category === 'MC/ATV') && (
        <CarTaskPicker assetId={assetId} onClose={() => setShowHousePicker(false)} onSaved={load} />
      )}
      {showPublish && (
        <PublishModal asset={asset} onClose={() => setShowPublish(false)} onPublished={load} />
      )}
    </div>
  )
}
