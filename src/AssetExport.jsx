// Service history export — renders a print-optimised document for a single asset.
// Navigate to /assets/:id/export to preview, then click "Skriv ut / Lagre som PDF".
//
// No third-party PDF library is used; we rely on the browser's built-in print
// renderer (File → Print → Save as PDF).  This gives perfect image fidelity,
// correct page breaks, and zero extra bundle weight.
//
// Print layout:
//   • Cover header  — asset name, category, reg. number, export date
//   • Summary strip — service count, total cost, km range, date range
//   • Log entries   — chronological (oldest first), each with km, cost, notes, photos
//   • Footer        — "Generert av Maintain"
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import { publicUrl, isImage } from './storage'
import Button from './components/Button'
import Icon from './components/Icon'
import Spinner from './components/Spinner'
import './AssetExport.css'

// Format "2026-05-09" → "09.05.2026"
function fmtDate(s) {
  if (!s) return '—'
  const [y, m, d] = s.split('-')
  return `${d}.${m}.${y}`
}

function fmtCost(n) {
  if (n == null) return null
  return `kr ${Number(n).toLocaleString('nb-NO')}`
}

function fmtKm(n) {
  if (n == null) return null
  return `${Number(n).toLocaleString('nb-NO')} km`
}

export default function AssetExport() {
  const { id: assetId } = useParams()
  const navigate = useNavigate()
  const [asset, setAsset] = useState(null)
  const [logs,  setLogs]  = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  useEffect(() => { load() }, [assetId])

  async function load() {
    setLoading(true)
    try {
      const [{ data: assetData, error: aErr }, { data: logsData, error: lErr }] =
        await Promise.all([
          supabase.from('assets').select('*').eq('id', assetId).single(),
          supabase
            .from('maintenance_logs')
            .select(`
              id, performed_on, cost, km_reading, notes,
              task:tasks(id, title),
              attachments:maintenance_log_attachments(id, file_path, file_name, mime_type)
            `)
            .eq('asset_id', assetId)
            // Oldest first — reads like a service book (chronological history)
            .order('performed_on', { ascending: true }),
        ])
      if (aErr) throw aErr
      if (lErr) throw lErr
      setAsset(assetData)
      setLogs(logsData ?? [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="export-center">
      <Spinner size="md" />
    </div>
  )

  if (error || !asset) return (
    <div className="export-center">
      <p style={{ color: 'var(--color-danger-600)' }}>{error ?? 'Fant ikke eiendelen'}</p>
      <Button variant="ghost" icon="arrowLeft" onClick={() => navigate(-1)}>Tilbake</Button>
    </div>
  )

  // Summary stats
  const totalCost    = logs.reduce((s, l) => s + (l.cost ?? 0), 0)
  const hasCost      = logs.some(l => l.cost != null)
  const kmValues     = logs.map(l => l.km_reading).filter(v => v != null)
  const minKm        = kmValues.length ? Math.min(...kmValues) : null
  const maxKm        = kmValues.length ? Math.max(...kmValues) : null
  const firstDate    = logs.length ? logs[0].performed_on : null
  const lastDate     = logs.length ? logs[logs.length - 1].performed_on : null
  const exportedDate = new Date().toLocaleDateString('nb-NO', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  return (
    <div className="export-root">

      {/* ── Action bar (hidden when printing) ─────────────────────── */}
      <div className="export-toolbar no-print">
        <Button variant="ghost" icon="arrowLeft" onClick={() => navigate(-1)}>
          Tilbake
        </Button>
        <Button icon="printer" onClick={() => window.print()}>
          Skriv ut / Lagre som PDF
        </Button>
      </div>

      {/* ── Print hint (hidden when printing) ─────────────────────── */}
      <p className="export-hint no-print">
        Klikk «Skriv ut / Lagre som PDF» og velg <strong>Lagre som PDF</strong> i skriverdialogen. På iPhone og iPad bruker du <strong>Del → Lagre som PDF</strong>.
      </p>

      {/* ── Document ─────────────────────────────────────────────── */}
      <div className="export-doc">

        {/* Cover */}
        <header className="export-cover">
          <div className="export-cover-brand">
            <Icon name="wrench" size={18} strokeWidth={2.5} />
            <span>Maintain</span>
          </div>

          <div className="export-cover-body">
            <h1 className="export-asset-name">{asset.name}</h1>
            <div className="export-cover-meta">
              {asset.category && (
                <span className="export-meta-chip">{asset.category}</span>
              )}
              {asset.description && (
                <span className="export-meta-desc">{asset.description}</span>
              )}
            </div>
          </div>

          <div className="export-cover-date">
            Vedlikeholdsrapport · eksportert {exportedDate}
          </div>
        </header>

        {/* Summary strip */}
        {logs.length > 0 && (
          <div className="export-summary">
            <div className="export-stat">
              <span className="export-stat-n">{logs.length}</span>
              <span className="export-stat-l">Servicelogger</span>
            </div>

            {hasCost && (
              <div className="export-stat">
                <span className="export-stat-n">
                  kr&nbsp;{totalCost.toLocaleString('nb-NO')}
                </span>
                <span className="export-stat-l">Total kostnad</span>
              </div>
            )}

            {minKm != null && (
              <div className="export-stat">
                <span className="export-stat-n">
                  {minKm.toLocaleString('nb-NO')}–{maxKm.toLocaleString('nb-NO')} km
                </span>
                <span className="export-stat-l">Kilometerstand</span>
              </div>
            )}

            {firstDate && (
              <div className="export-stat">
                <span className="export-stat-n">
                  {fmtDate(firstDate)} – {fmtDate(lastDate)}
                </span>
                <span className="export-stat-l">Periode</span>
              </div>
            )}
          </div>
        )}

        {/* Log entries */}
        <h2 className="export-section-heading">Servicehistorikk</h2>

        {logs.length === 0 ? (
          <p className="export-empty">Ingen servicelogger registrert for denne eiendelen.</p>
        ) : (
          <div className="export-entries">
            {logs.map((log, idx) => {
              const images = (log.attachments ?? []).filter(a => isImage(a.mime_type))
              const docs   = (log.attachments ?? []).filter(a => !isImage(a.mime_type))

              return (
                <div key={log.id} className="export-entry">

                  {/* Entry header row */}
                  <div className="export-entry-head">
                    <span className="export-entry-num">{idx + 1}</span>
                    <div className="export-entry-title-block">
                      <span className="export-entry-title">
                        {log.task?.title ?? '(Slettet oppgave)'}
                      </span>
                      <span className="export-entry-date">{fmtDate(log.performed_on)}</span>
                    </div>
                    <div className="export-entry-chips">
                      {log.km_reading != null && (
                        <span className="export-chip">{fmtKm(log.km_reading)}</span>
                      )}
                      {log.cost != null && (
                        <span className="export-chip">{fmtCost(log.cost)}</span>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  {log.notes && (
                    <p className="export-entry-notes">{log.notes}</p>
                  )}

                  {/* Inline photos */}
                  {images.length > 0 && (
                    <div className="export-entry-images">
                      {images.map(att => (
                        <img
                          key={att.id}
                          src={publicUrl(att.file_path)}
                          alt={att.file_name}
                          className="export-entry-img"
                        />
                      ))}
                    </div>
                  )}

                  {/* Document attachments (not renderable as images) */}
                  {docs.length > 0 && (
                    <div className="export-entry-docs">
                      {docs.map(att => (
                        <span key={att.id} className="export-doc-chip">
                          <Icon name="image" size={12} /> {att.file_name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <footer className="export-footer">
          Generert av <strong>Maintain</strong> — vedlikeholdsappen som husker alt
        </footer>
      </div>
    </div>
  )
}
