// Modal for publishing an asset as a public template.
// On the very first publish the user is asked to choose a display name, which
// is stored in notification_preferences.display_name and shown in the library.
// If the asset has a cover image, the user can toggle whether to include it.
// When excluded (or when the asset has no image), the template's image_url
// is NULL and the library shows the standard category image instead.
import { useEffect, useState } from 'react'
import Modal from '../components/Modal'
import ConfirmDialog from '../components/ConfirmDialog'
import Button from '../components/Button'
import Icon from '../components/Icon'
import { Input } from '../components/Input'
import { publishAsset, unpublishAsset, getTemplateForAsset } from '../templates'
import { categoryImgProps } from '../categoryImages'
import { supabase } from '../supabaseClient'

export default function PublishModal({ asset, onClose, onPublished }) {
  const [published, setPublished]       = useState(null)
  const [busy, setBusy]                 = useState(false)
  const [error, setError]               = useState(null)
  const [confirmUnpublish, setConfirmUnpublish] = useState(false)
  const [includeImage, setIncludeImage] = useState(!!asset?.image_url)

  // Display-name state
  const [displayName, setDisplayName]   = useState('')
  const [nameLoaded, setNameLoaded]     = useState(false)

  useEffect(() => { refresh(); loadDisplayName() }, [asset?.id])

  async function refresh() {
    if (!asset?.id) return
    const t = await getTemplateForAsset(asset.id)
    setPublished(t)
  }

  async function loadDisplayName() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('notification_preferences')
      .select('display_name')
      .eq('user_id', user.id)
      .maybeSingle()
    setDisplayName(data?.display_name ?? '')
    setNameLoaded(true)
  }

  async function saveDisplayName(name) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase
      .from('notification_preferences')
      .update({ display_name: name || null })
      .eq('user_id', user.id)
  }

  async function handlePublish() {
    if (!published && !displayName.trim()) {
      setError('Velg et visningsnavn før du publiserer')
      return
    }
    setBusy(true); setError(null)
    try {
      const name = displayName.trim() || null
      if (name) await saveDisplayName(name)
      await publishAsset(asset.id, includeImage, name)
      await refresh()
      onPublished?.()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function doUnpublish() {
    setConfirmUnpublish(false)
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

  const previewUrl = includeImage && asset?.image_url ? asset.image_url : null

  // Show name field only on first-time publish and when name isn't already set
  const showNameField = nameLoaded && !published && !displayName

  return (
    <Modal title="Publiser som mal" onClose={onClose}>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
        Publiserer du <strong>{asset?.name}</strong> blir den synlig for alle i fellesbiblioteket.
        Andre kan kopiere malen til sin egen konto med ett klikk.
      </p>

      {/* Display name — shown on first publish if not already set */}
      {showNameField && (
        <div style={{
          background: 'var(--color-surface-alt)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-4)',
          marginBottom: 'var(--space-4)',
          borderLeft: '3px solid var(--color-primary-400)',
        }}>
          <p style={{ margin: '0 0 var(--space-3)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text)' }}>
            Velg et visningsnavn som vises i biblioteket.
          </p>
          <Input
            label="Visningsnavn"
            placeholder="f.eks. Ola Nordmann eller @ola"
            value={displayName}
            onChange={e => { setDisplayName(e.target.value); setError(null) }}
            autoFocus
            maxLength={50}
          />
        </div>
      )}

      {/* Show current display name if already set and not yet published */}
      {nameLoaded && !published && displayName && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
          marginBottom: 'var(--space-4)',
          fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)',
        }}>
          <Icon name="user" size={14} />
          Publiseres som <strong style={{ color: 'var(--color-text)', marginLeft: 4 }}>{displayName}</strong>
          <button
            type="button"
            onClick={() => setDisplayName('')}
            style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: 'var(--font-size-sm)', padding: 0, marginLeft: 4 }}
          >
            Endre
          </button>
        </div>
      )}

      {/* Image toggle — only shown when the asset has a cover photo */}
      {asset?.image_url && (
        <div style={{
          display: 'flex', gap: 'var(--space-4)', alignItems: 'center',
          background: 'var(--color-surface-alt)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-3) var(--space-4)',
          marginBottom: 'var(--space-4)',
        }}>
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
            {published.author_name && (
              <span style={{ marginLeft: 4, fontWeight: 'normal' }}>· av {published.author_name}</span>
            )}
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
            <Button variant="danger" onClick={() => setConfirmUnpublish(true)} loading={busy}>Avpubliser</Button>
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
      <ConfirmDialog
        open={confirmUnpublish}
        title="Avpubliser mal"
        message="Malen fjernes fra fellesbiblioteket. Andre kan da ikke lenger kopiere den."
        confirmLabel="Avpubliser"
        variant="danger"
        loading={busy}
        onConfirm={doUnpublish}
        onClose={() => setConfirmUnpublish(false)}
      />
    </Modal>
  )
}
