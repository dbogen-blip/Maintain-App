// Modal for publishing an asset as a public template.
// If the asset has a cover image, the user can toggle whether to include it.
// When excluded (or when the asset has no image), the template's image_url
// is NULL and the library shows the standard category image instead.
import { useEffect, useState } from 'react'
import Modal from '../components/Modal'
import Button from '../components/Button'
import Icon from '../components/Icon'
import { publishAsset, unpublishAsset, getTemplateForAsset } from '../templates'
import { categoryImgProps } from '../categoryImages'

export default function PublishModal({ asset, onClose, onPublished }) {
  const [published, setPublished]       = useState(null)
  const [busy, setBusy]                 = useState(false)
  const [error, setError]               = useState(null)
  // Default to sharing the image if the asset already has one
  const [includeImage, setIncludeImage] = useState(!!asset?.image_url)

  useEffect(() => { refresh() }, [asset?.id])

  async function refresh() {
    if (!asset?.id) return
    const t = await getTemplateForAsset(asset.id)
    setPublished(t)
  }

  async function handlePublish() {
    setBusy(true); setError(null)
    try {
      await publishAsset(asset.id, includeImage)
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

  // Which image will appear in the library
  const previewUrl = includeImage && asset?.image_url ? asset.image_url : null

  return (
    <Modal title="Publiser som mal" onClose={onClose}>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
        Publiserer du <strong>{asset?.name}</strong> blir den synlig for alle i fellesbiblioteket.
        Andre kan kopiere malen til sin egen konto med ett klikk.
      </p>

      {/* Image toggle — only shown when the asset has a cover photo */}
      {asset?.image_url && (
        <div style={{
          display: 'flex', gap: 'var(--space-4)', alignItems: 'center',
          background: 'var(--color-surface-alt)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-3) var(--space-4)',
          marginBottom: 'var(--space-4)',
        }}>
          {/* Preview of what will appear in the library */}
          <div style={{
            width: 72, height: 56, flexShrink: 0,
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden', border: '1px solid var(--color-border)',
          }}>
            {previewUrl
              ? <img src={previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <img {...categoryImgProps(asset.category)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            }
          </div>

          <div style={{ flex: 1 }}>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', gap: 'var(--space-3)' }}>
              <div>
                <div style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-sm)' }}>
                  Del bildet mitt
                </div>
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>
                  {includeImage
                    ? 'Ditt bilde vises i biblioteket'
                    : 'Standard kategori-bilde brukes'}
                </div>
              </div>
              {/* Toggle switch */}
              <div
                onClick={() => setIncludeImage(v => !v)}
                style={{
                  width: 44, height: 24, borderRadius: 12, flexShrink: 0,
                  background: includeImage ? 'var(--color-primary-500)' : 'var(--color-border-strong)',
                  position: 'relative', transition: 'background 0.2s', cursor: 'pointer',
                }}
              >
                <div style={{
                  position: 'absolute', top: 3,
                  left: includeImage ? 23 : 3,
                  width: 18, height: 18,
                  borderRadius: '50%', background: '#fff',
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }} />
              </div>
            </label>
          </div>
        </div>
      )}

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
          <li>Navn, kategori og beskrivelse av eiendelen</li>
          <li>{asset?.image_url
            ? (includeImage ? 'Ditt eget bilde' : 'Standard kategori-bilde')
            : 'Standard kategori-bilde (du har ikke lagt inn eget bilde)'}
          </li>
          <li>Vedlikeholdsoppgaver med tittel, intervall og prioritet</li>
          <li>Beskrivelser av hvordan oppgavene utføres + tilhørende vedlegg</li>
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
