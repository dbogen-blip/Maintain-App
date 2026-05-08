import { useEffect, useState } from 'react'
import { getTemplate, forkTemplate, bumpTemplateView } from './templates'
import { publicUrl, isImage } from './storage'
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
  const [tpl, setTpl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [user, setUser] = useState(null)
  const [forking, setForking] = useState(false)
  const [forkResult, setForkResult] = useState(null) // { newAssetId }

  useEffect(() => {
    load()
    bumpTemplateView(templateId)
    supabase.auth.getUser().then(({ data }) => setUser(data?.user ?? null))
  }, [templateId])

  async function load() {
    setLoading(true)
    try {
      const data = await getTemplate(templateId)
      const tasks = (data.tasks ?? []).sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
      setTpl({ ...data, tasks })
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

  return (
    <div className="container">
      <Button variant="ghost" icon="arrowLeft" onClick={onBack}>Tilbake til biblioteket</Button>

      <Card className="detail-hero" padding={0}>
        {tpl.image_url && (
          <div className="detail-hero-image">
            <img src={tpl.image_url} alt="" />
          </div>
        )}
        <div className="detail-hero-body">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
            <div>
              <h1>{tpl.name}</h1>
              <div className="row" style={{ marginTop: 'var(--space-2)', flexWrap: 'wrap' }}>
                {tpl.category && <Badge>{tpl.category}</Badge>}
                <Badge variant="neutral">{tpl.forks_count} har brukt denne</Badge>
                <Badge variant="neutral">{tpl.views_count} visninger</Badge>
              </div>
            </div>
            {forkResult ? (
              <div className="row" style={{ flexWrap: 'wrap' }}>
                <Badge variant="success">Lagt til i din samling</Badge>
                <Button onClick={() => onForked?.(forkResult.newAssetId)} icon="arrowRight" iconRight="arrowRight">
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
