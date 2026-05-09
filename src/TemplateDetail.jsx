// Detail view for a single public template.
// Shows tasks, attachments, usage stats, and allows the user to fork the template
// into their own account. Logged-in users can also star/unstar the template.
// Users cannot star their own templates (the star button is hidden for the author).
import { useEffect, useState } from 'react'
import { getTemplate, forkTemplate, bumpTemplateView, toggleStar, getUserStarredIds } from './templates'
import { publicUrl, isImage } from './storage'
import { categoryImgProps } from './categoryImages'
import { supabase } from './supabaseClient'
import Card from './components/Card'
import Button from './components/Button'
import Badge from './components/Badge'
import Icon from './components/Icon'
import EmptyState from './components/EmptyState'
import Spinner from './components/Spinner'
import './AssetDetail.css'

function priorityLabel(p) {
  return p === 1 ? 'Høy' : p === 3 ? 'Lav' : 'Normal'
}

export default function TemplateDetail({ templateId, onBack, onForked }) {
  const [tpl, setTpl]             = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [user, setUser]           = useState(null)
  const [forking, setForking]     = useState(false)
  const [forkResult, setForkResult] = useState(null)
  const [starred, setStarred]     = useState(false)
  const [starBusy, setStarBusy]   = useState(false)
  const [localStars, setLocalStars] = useState(0) // optimistic star count

  useEffect(() => {
    load()
    bumpTemplateView(templateId)
    supabase.auth.getUser().then(({ data }) => setUser(data?.user ?? null))
  }, [templateId])

  // Load starred state once user is known
  useEffect(() => {
    if (!user) return
    getUserStarredIds().then(ids => setStarred(ids.has(templateId)))
  }, [user, templateId])

  async function load() {
    setLoading(true)
    try {
      const data = await getTemplate(templateId)
      const tasks = (data.tasks ?? []).sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
      setTpl({ ...data, tasks })
      setLocalStars(data.stars_count ?? 0)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleFork() {
    setForking(true); setError(null)
    try {
      const newAssetId = await forkTemplate(templateId)
      setForkResult({ newAssetId })
    } catch (e) {
      setError(e.message)
    } finally {
      setForking(false)
    }
  }

  async function handleStar() {
    if (!user || starBusy) return
    setStarBusy(true)
    // Optimistic update
    const newStarred = !starred
    setStarred(newStarred)
    setLocalStars(n => n + (newStarred ? 1 : -1))
    try {
      await toggleStar(templateId)
    } catch (e) {
      // Revert on failure
      setStarred(!newStarred)
      setLocalStars(n => n + (newStarred ? -1 : 1))
    } finally {
      setStarBusy(false)
    }
  }

  if (loading) return (
    <div className="container" style={{ display: 'flex', justifyContent: 'center', paddingTop: 'var(--space-8)' }}>
      <Spinner size="md" />
    </div>
  )
  if (!tpl) return (
    <div className="container">
      <EmptyState title="Fant ikke malen" action={<Button onClick={onBack}>Tilbake</Button>} />
    </div>
  )

  // Don't show star button on the user's own templates
  const isOwn = user && tpl.user_id === user.id
  const canStar = user && !isOwn

  return (
    <div className="container">
      <Button variant="ghost" icon="arrowLeft" onClick={onBack}>Tilbake til biblioteket</Button>

      <Card className="detail-hero" padding={0}>
        <div className="detail-hero-image">
          {tpl.image_url
            ? <img src={tpl.image_url} alt="" />
            : <img {...categoryImgProps(tpl.category)} alt="" />}
        </div>
        <div className="detail-hero-body">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
            <div>
              <h1>{tpl.name}</h1>
              <div className="row" style={{ marginTop: 'var(--space-2)', flexWrap: 'wrap' }}>
                {tpl.category && <Badge>{tpl.category}</Badge>}
                <Badge variant="neutral">
                  <Icon name="upload" size={12} style={{ marginRight: 4 }} /> {tpl.forks_count} brukt
                </Badge>
                <Badge variant="neutral">
                  <Icon name="star" size={12} style={{ marginRight: 4 }} /> {localStars} stjerner
                </Badge>
              </div>
            </div>

            <div className="row" style={{ flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              {/* Star button — only for logged-in users who don't own this template */}
              {canStar && (
                <button
                  type="button"
                  onClick={handleStar}
                  disabled={starBusy}
                  title={starred ? 'Fjern stjerne' : 'Gi stjerne'}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    background: starred ? 'var(--color-warning-50)' : 'var(--color-surface)',
                    color: starred ? '#d97706' : 'var(--color-text-muted)',
                    cursor: 'pointer', fontSize: 'var(--font-size-sm)',
                    fontFamily: 'inherit', fontWeight: 'var(--font-weight-medium)',
                    transition: 'all 0.15s',
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg" width={16} height={16}
                    viewBox="0 0 24 24"
                    fill={starred ? 'currentColor' : 'none'}
                    stroke="currentColor" strokeWidth={2}
                    strokeLinecap="round" strokeLinejoin="round"
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  {starred ? 'Stjernemerket' : 'Gi stjerne'}
                </button>
              )}

              {forkResult ? (
                <div className="row">
                  <Badge variant="success">Lagt til i din samling</Badge>
                  <Button onClick={() => onForked?.(forkResult.newAssetId)} icon="arrowRight">
                    Gå til eiendelen
                  </Button>
                </div>
              ) : user ? (
                <Button onClick={handleFork} loading={forking} icon="plus">
                  Bruk denne malen
                </Button>
              ) : (
                <Button variant="secondary" onClick={onBack}>Logg inn for å bruke</Button>
              )}
            </div>
          </div>
          {tpl.description && (
            <p style={{ marginTop: 'var(--space-3)', color: 'var(--color-text-muted)' }}>
              {tpl.description}
            </p>
          )}
        </div>
      </Card>

      {error && (
        <p style={{ color: 'var(--color-danger-700)', marginTop: 'var(--space-3)' }}>{error}</p>
      )}

      <h2 style={{ margin: 'var(--space-6) 0 var(--space-3)' }}>
        Vedlikeholdsoppgaver ({tpl.tasks.length})
      </h2>

      {tpl.tasks.length === 0 ? (
        <EmptyState icon="list" title="Ingen oppgaver i denne malen" />
      ) : (
        <div className="task-list">
          {tpl.tasks.map(task => (
            <Card key={task.id} padding={4}>
              <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                <h3 style={{ margin: 0 }}>{task.title}</h3>
                <div className="row">
                  <Badge variant="neutral">Hver {task.interval_days} dag</Badge>
                  {task.priority !== 2 && <Badge variant="neutral">{priorityLabel(task.priority)} prioritet</Badge>}
                </div>
              </div>

              {task.description && (
                <div className="task-section" style={{ marginTop: 'var(--space-3)' }}>
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
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
