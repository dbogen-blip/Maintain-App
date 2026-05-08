import { useEffect, useState } from 'react'
import Modal from '../components/Modal'
import Button from '../components/Button'
import Badge from '../components/Badge'
import Icon from '../components/Icon'
import { publishAsset, unpublishAsset, getTemplateForAsset } from '../templates'

export default function PublishModal({ asset, onClose, onPublished }) {
  const [published, setPublished] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => { refresh() }, [asset?.id])

  async function refresh() {
    if (!asset?.id) return
    const t = await getTemplateForAsset(asset.id)
    setPublished(t)
  }

  async function handlePublish() {
    setBusy(true); setError(null)
    try {
      await publishAsset(asset.id)
      await refresh()
      onPublished?.()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleUnpublish() {
    if (!confirm('Fjerne malen fra fellesbiblioteket? Andre kan da ikke lenger kopiere den.')) return
    setBusy(true); setError(null)
    try {
      await unpublishAsset(asset.id)
      await refresh()
      onPublished?.()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Publiser som mal" onClose={onClose}>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
        Publiserer du <strong>{asset?.name}</strong> blir den synlig for alle i fellesbiblioteket.
        Andre kan kopiere malen til sin egen konto med ett klikk.
      </p>

      <div style={{
        background: 'var(--color-surface-alt)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-4)',
        marginBottom: 'var(--space-4)',
      }}>
        <h4 style={{ margin: 0, marginBottom: 'var(--space-2)', fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', color: 'var(--color-text-soft)', letterSpacing: '0.05em' }}>
          Hva blir delt
        </h4>
        <ul style={{ margin: 0, paddingLeft: 'var(--space-5)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
          <li>Navn, kategori, beskrivelse og bilde av eiendelen</li>
          <li>Vedlikeholdsoppgaver med tittel, intervall og prioritet</li>
          <li>Beskrivelser av hvordan oppgavene utføres + tilhørende vedlegg (PDF, bilder)</li>
        </ul>
        <h4 style={{ margin: 'var(--space-3) 0 var(--space-2)', fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', color: 'var(--color-text-soft)', letterSpacing: '0.05em' }}>
          Hva forblir privat
        </h4>
        <ul style={{ margin: 0, paddingLeft: 'var(--space-5)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
          <li>Din vedlikeholdshistorikk og bilder fra utført arbeid</li>
          <li>Når du sist gjorde noe / neste forfall</li>
          <li>Kostnader og personlige notater</li>
        </ul>
      </div>

      {published && (
        <div style={{
          padding: 'var(--space-3)',
          background: 'var(--color-success-50)',
          color: 'var(--color-success-700)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--space-3)',
          fontSize: 'var(--font-size-sm)',
        }}>
          <div className="row">
            <Icon name="check" size={16} />
            <strong>Publisert</strong>
          </div>
          <div style={{ marginTop: 'var(--space-1)' }}>
            {published.forks_count} har brukt malen · {published.views_count} visninger
          </div>
        </div>
      )}

      {error && (
        <p style={{ color: 'var(--color-danger-700)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-3)' }}>
          {error}
        </p>
      )}

      <div className="row" style={{ justifyContent: 'flex-end', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        <Button variant="secondary" onClick={onClose}>Lukk</Button>
        {published ? (
          <>
            <Button variant="danger" onClick={handleUnpublish} loading={busy}>Avpubliser</Button>
            <Button onClick={handlePublish} loading={busy} icon="refresh">
              Oppdater snapshot
            </Button>
          </>
        ) : (
          <Button onClick={handlePublish} loading={busy} icon="upload">
            Publiser
          </Button>
        )}
      </div>
    </Modal>
  )
}
