import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import {
  isPushSupported,
  getCurrentSubscription,
  subscribePush,
  unsubscribePush,
} from './push'
import Card from './components/Card'
import Button from './components/Button'
import Badge from './components/Badge'
import Icon from './components/Icon'
import { Input, Checkbox } from './components/Input'
import ConfirmDialog from './components/ConfirmDialog'
import Toast from './components/Toast'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

export default function Settings() {
  const navigate = useNavigate()
  const [prefs, setPrefs] = useState(null)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const [pushStatus, setPushStatus] = useState({ supported: false, permission: 'default', subscribed: false })
  const [pushBusy, setPushBusy] = useState(false)
  const [pushError, setPushError] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState(null)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [publishedTemplates, setPublishedTemplates] = useState([])
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [deleteError, setDeleteError] = useState(null)
  // deleteStep drives the account-deletion dialog sequence:
  //   null              → no dialog open
  //   'warn-published'  → info dialog: "you still have published templates"
  //   'confirm1'        → first danger confirm
  //   'confirm2'        → final danger confirm
  const [deleteStep, setDeleteStep] = useState(null)
  const [saveError, setSaveError] = useState(null)
  const [trashedAssets, setTrashedAssets] = useState([])
  const [trashLoading, setTrashLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [confirmPurge, setConfirmPurge] = useState(null) // asset object | null
  const [calendarToken, setCalendarToken] = useState(null)
  const [calendarBusy, setCalendarBusy] = useState(false)
  const [calendarCopied, setCalendarCopied] = useState(false)

  useEffect(() => {
    load()
    refreshPushStatus()
    loadPublishedTemplates()
    loadTrash()
    loadCalendarToken()
  }, [])

  async function loadTrash() {
    setTrashLoading(true)
    // Assets deleted within the last 7 days (older ones are considered auto-purged)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 7)
    const { data } = await supabase
      .from('assets')
      .select('id, name, category, deleted_at')
      .not('deleted_at', 'is', null)
      .gte('deleted_at', cutoff.toISOString())
      .order('deleted_at', { ascending: false })
    setTrashedAssets(data ?? [])
    setTrashLoading(false)
  }

  async function restoreAsset(asset) {
    await supabase.from('assets').update({ deleted_at: null }).eq('id', asset.id)
    // Also restore any tasks that were soft-deleted as part of this deletion
    // (tasks deleted independently keep their own deleted_at)
    setTrashedAssets(prev => prev.filter(a => a.id !== asset.id))
    setToast({ message: `«${asset.name}» er gjenopprettet` })
  }

  async function purgeAsset(asset) {
    // Hard delete — also cascades tasks, logs, attachments via FK
    await supabase.from('assets').delete().eq('id', asset.id)
    setTrashedAssets(prev => prev.filter(a => a.id !== asset.id))
    setConfirmPurge(null)
    setToast({ message: `«${asset.name}» er slettet permanent` })
  }

  async function loadCalendarToken() {
    const { data } = await supabase
      .from('calendar_tokens')
      .select('token')
      .maybeSingle()
    if (data) setCalendarToken(data.token)
  }

  async function generateCalendarToken() {
    setCalendarBusy(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('calendar_tokens')
      .upsert({ user_id: user.id }, { onConflict: 'user_id' })
      .select('token')
      .single()
    setCalendarToken(data.token)
    setCalendarBusy(false)
  }

  async function revokeCalendarToken() {
    await supabase.from('calendar_tokens').delete().eq('token', calendarToken)
    setCalendarToken(null)
  }

  function calendarUrl() {
    return `${SUPABASE_URL}/functions/v1/calendar-feed?token=${calendarToken}`
  }

  async function copyCalendarUrl() {
    await navigator.clipboard.writeText(calendarUrl())
    setCalendarCopied(true)
    setTimeout(() => setCalendarCopied(false), 2000)
  }

  async function loadPublishedTemplates() {
    const { data } = await supabase
      .from('asset_templates')
      .select('id, name')
    setPublishedTemplates(data ?? [])
  }

  function handleDeleteAccount() {
    if (publishedTemplates.length > 0) {
      setDeleteStep('warn-published')
    } else {
      setDeleteStep('confirm1')
    }
  }

  async function runDeleteAccount() {
    setDeletingAccount(true)
    setDeleteError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${SUPABASE_URL}/functions/v1/delete-account`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Sletting feilet')
      // Auth user is now deleted — sign out locally
      await supabase.auth.signOut()
    } catch (e) {
      setDeleteError(e.message)
      setDeletingAccount(false)
      setDeleteStep(null)
    }
  }

  async function load() {
    const { data } = await supabase
      .from('notification_preferences')
      .select('*')
      .maybeSingle()
    if (!data) {
      const { data: user } = await supabase.auth.getUser()
      const { data: created } = await supabase
        .from('notification_preferences')
        .insert({ user_id: user.user.id })
        .select()
        .single()
      setPrefs(created)
      return
    }
    setPrefs(data)
  }

  async function refreshPushStatus() {
    const supported = isPushSupported()
    if (!supported) return setPushStatus({ supported: false, permission: 'default', subscribed: false })
    const sub = await getCurrentSubscription()
    setPushStatus({ supported: true, permission: Notification.permission, subscribed: !!sub })
  }

  async function handleSubscribe() {
    setPushBusy(true); setPushError(null)
    try { await subscribePush(); await refreshPushStatus() }
    catch (e) { setPushError(e.message) }
    finally { setPushBusy(false) }
  }
  async function handleUnsubscribe() {
    setPushBusy(true); setPushError(null)
    try { await unsubscribePush(); await refreshPushStatus() }
    catch (e) { setPushError(e.message) }
    finally { setPushBusy(false) }
  }

  async function save() {
    if (!prefs) return
    setSaving(true)
    const { error } = await supabase
      .from('notification_preferences')
      .update({
        email_enabled: prefs.email_enabled,
        push_enabled: prefs.push_enabled,
        lead_time_days: prefs.lead_time_days,
        timezone: prefs.timezone,
        digest_frequency: prefs.digest_frequency,
      })
      .eq('user_id', prefs.user_id)
    setSaving(false)
    if (error) { setSaveError(error.message); return }
    setSavedAt(new Date())
  }

  async function handleSetPassword(e) {
    e.preventDefault()
    setPasswordError(null); setPasswordSaved(false)
    if (newPassword.length < 6) { setPasswordError('Passordet må være minst 6 tegn'); return }
    if (newPassword !== confirmPassword) { setPasswordError('Passordene stemmer ikke overens'); return }
    setPasswordSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPasswordSaving(false)
    if (error) setPasswordError(error.message)
    else { setNewPassword(''); setConfirmPassword(''); setPasswordSaved(true) }
  }

  if (!prefs) return <div className="container"><p className="muted">Laster ...</p></div>

  return (
    <div className="container" style={{ maxWidth: 560 }}>
      <Button variant="ghost" icon="arrowLeft" onClick={() => navigate(-1)}>Tilbake</Button>

      <h1 style={{ margin: 'var(--space-3) 0 var(--space-5)' }}>Innstillinger</h1>

      <Card padding={5} style={{ marginBottom: 'var(--space-4)' }}>
        <h2 style={{ marginBottom: 'var(--space-1)' }}>Sammendrag på e-post</h2>
        <p className="muted" style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-4)' }}>
          Få en samlet oversikt over forfalt og kommende vedlikehold rett i innboksen.
        </p>
        {[
          { value: 'none',    label: 'Ingen',      hint: '' },
          { value: 'weekly',  label: 'Ukentlig',   hint: 'Sendes hver mandag morgen' },
          { value: 'monthly', label: 'Månedlig',   hint: 'Sendes 1. i hver måned' },
        ].map(opt => (
          <label key={opt.value} style={{
            display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)',
            padding: 'var(--space-3) 0',
            borderBottom: opt.value !== 'monthly' ? '1px solid var(--color-border)' : 'none',
            cursor: 'pointer',
          }}>
            <input
              type="radio"
              name="digest_frequency"
              value={opt.value}
              checked={prefs.digest_frequency === opt.value}
              onChange={() => setPrefs({ ...prefs, digest_frequency: opt.value })}
              style={{ marginTop: 3, accentColor: 'var(--color-primary)', flexShrink: 0 }}
            />
            <div>
              <div style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-sm)' }}>{opt.label}</div>
              {opt.hint && <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{opt.hint}</div>}
            </div>
          </label>
        ))}
        <div className="row" style={{ marginTop: 'var(--space-4)' }}>
          <Button onClick={save} loading={saving} icon="check">Lagre</Button>
          {savedAt && <span className="muted" style={{ fontSize: 'var(--font-size-sm)' }}>Lagret {savedAt.toLocaleTimeString('nb-NO')}</span>}
        </div>
      </Card>

      <Card padding={5} style={{ marginBottom: 'var(--space-4)' }}>
        <h2 style={{ marginBottom: 'var(--space-3)' }}>Varselkanaler</h2>
        <Checkbox
          label="Send e-post når oppgaver nærmer seg forfall"
          checked={prefs.email_enabled}
          onChange={e => setPrefs({ ...prefs, email_enabled: e.target.checked })}
        />
        <Checkbox
          label="Send push-varsel når oppgaver nærmer seg forfall"
          checked={prefs.push_enabled}
          onChange={e => setPrefs({ ...prefs, push_enabled: e.target.checked })}
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
          <Input
            label="Varsle X dager før forfall"
            type="number"
            min="0" max="60"
            value={prefs.lead_time_days}
            onChange={e => setPrefs({ ...prefs, lead_time_days: Number(e.target.value) })}
          />
          <Input
            label="Tidssone"
            value={prefs.timezone}
            onChange={e => setPrefs({ ...prefs, timezone: e.target.value })}
          />
        </div>
        <div className="row" style={{ marginTop: 'var(--space-3)' }}>
          <Button onClick={save} loading={saving} icon="check">Lagre varselinnstillinger</Button>
          {savedAt && <span className="muted" style={{ fontSize: 'var(--font-size-sm)' }}>Lagret {savedAt.toLocaleTimeString('nb-NO')}</span>}
        </div>
      </Card>

      <Card padding={5} style={{ marginBottom: 'var(--space-4)' }}>
        <h2 style={{ marginBottom: 'var(--space-1)' }}>Passord</h2>
        <p className="muted" style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-4)' }}>
          Sett eller bytt passord for å logge inn uten innloggingslenke.
        </p>
        <form onSubmit={handleSetPassword}>
          <div style={{ position: 'relative' }}>
            <Input
              label="Nytt passord"
              type={showPassword ? 'text' : 'password'}
              placeholder="Minst 6 tegn"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              style={{ position: 'absolute', right: 14, top: 34, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 0 }}
              tabIndex={-1}
            >
              <Icon name={showPassword ? 'eyeOff' : 'eye'} size={18} />
            </button>
          </div>
          <Input
            label="Bekreft passord"
            type={showPassword ? 'text' : 'password'}
            placeholder="Gjenta passordet"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
          />
          {passwordError && <p style={{ color: 'var(--color-danger-600)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-3)' }}>{passwordError}</p>}
          <div className="row">
            <Button type="submit" loading={passwordSaving} icon="lock">Lagre passord</Button>
            {passwordSaved && <span className="muted" style={{ fontSize: 'var(--font-size-sm)' }}>Passord oppdatert ✓</span>}
          </div>
        </form>
      </Card>

      <Card padding={5} style={{ marginBottom: 'var(--space-4)' }}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
          <h2 style={{ margin: 0 }}>Push på denne enheten</h2>
          {pushStatus.supported && (
            <Badge variant={pushStatus.subscribed ? 'success' : 'neutral'}>
              {pushStatus.subscribed ? 'Aktiv' : 'Ikke aktiv'}
            </Badge>
          )}
        </div>

        {!pushStatus.supported ? (
          <p className="muted">
            Denne nettleseren støtter ikke push-varsler. På iPhone må appen legges til på Hjem-skjermen først.
          </p>
        ) : (
          <>
            <p className="muted" style={{ fontSize: 'var(--font-size-sm)' }}>
              Tillatelse: {pushStatus.permission}
            </p>
            {!pushStatus.subscribed ? (
              <Button onClick={handleSubscribe} loading={pushBusy} icon="bell">
                Skru på push
              </Button>
            ) : (
              <Button variant="secondary" onClick={handleUnsubscribe} loading={pushBusy}>
                Skru av push på denne enheten
              </Button>
            )}
            {pushError && <p style={{ color: 'var(--color-danger-600)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-2)' }}>{pushError}</p>}
          </>
        )}
      </Card>

      {/* Kalenderabonnement */}
      <Card padding={5} style={{ marginBottom: 'var(--space-4)' }}>
        <h2 style={{ marginBottom: 'var(--space-1)' }}>Kalenderabonnement</h2>
        <p className="muted" style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-4)' }}>
          Abonner på vedlikeholdsoppgavene dine i Google Calendar, Apple Kalender eller Outlook.
          Kalenderen oppdateres automatisk.
        </p>
        {!calendarToken ? (
          <Button onClick={generateCalendarToken} loading={calendarBusy} icon="calendar">
            Opprett kalenderlenke
          </Button>
        ) : (
          <>
            <div style={{
              display: 'flex', gap: 'var(--space-2)', alignItems: 'center',
              background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)', padding: 'var(--space-2) var(--space-3)',
              marginBottom: 'var(--space-3)',
            }}>
              <code style={{
                flex: 1, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                minWidth: 0,
              }}>
                {calendarUrl()}
              </code>
            </div>
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <Button icon="copy" onClick={copyCalendarUrl}>
                {calendarCopied ? 'Kopiert!' : 'Kopier URL'}
              </Button>
              <a
                href={`webcal://${calendarUrl().replace(/^https?:\/\//, '')}`}
                style={{ textDecoration: 'none' }}
              >
                <Button variant="secondary" icon="calendar">Åpne i Kalender</Button>
              </a>
              <Button variant="secondary" onClick={revokeCalendarToken} loading={calendarBusy}>
                Tilbakekall lenke
              </Button>
            </div>
            <p className="muted" style={{ fontSize: 'var(--font-size-xs)', marginTop: 'var(--space-2)' }}>
              Alle med denne lenken kan se oppgavene dine. Klikk «Tilbakekall» for å ugyldiggjøre den.
            </p>
          </>
        )}
      </Card>

      {/* Papirkurv */}
      <Card padding={5} style={{ marginBottom: 'var(--space-4)' }}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
          <h2 style={{ margin: 0 }}>Papirkurv</h2>
          {trashedAssets.length > 0 && <Badge variant="neutral">{trashedAssets.length}</Badge>}
        </div>
        <p className="muted" style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-3)' }}>
          Slettede eiendeler kan gjenopprettes innen 7 dager. Etter det slettes de permanent automatisk.
        </p>
        {trashLoading ? (
          <p className="muted" style={{ fontSize: 'var(--font-size-sm)' }}>Laster ...</p>
        ) : trashedAssets.length === 0 ? (
          <p className="muted" style={{ fontSize: 'var(--font-size-sm)' }}>Papirkurven er tom.</p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {trashedAssets.map((a, i) => {
              const deletedAt = new Date(a.deleted_at)
              const daysLeft = 7 - Math.floor((Date.now() - deletedAt.getTime()) / 86400000)
              return (
                <li
                  key={a.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                    padding: 'var(--space-3) 0',
                    borderTop: i > 0 ? '1px solid var(--color-border)' : 'none',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-sm)' }}>{a.name}</div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                      {a.category && <span>{a.category} · </span>}
                      Slettes om {daysLeft} dag{daysLeft !== 1 ? 'er' : ''}
                    </div>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => restoreAsset(a)}>Gjenopprett</Button>
                  <Button size="sm" variant="danger" icon="trash" onClick={() => setConfirmPurge(a)} />
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      {/* Danger zone — account deletion */}
      <Card padding={5} style={{ borderColor: 'rgba(239,68,68,.25)', marginTop: 'var(--space-4)' }}>
        <h2 style={{ marginBottom: 'var(--space-1)', color: 'var(--color-danger-700)' }}>Slett konto</h2>
        <p className="muted" style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-4)' }}>
          Sletter kontoen din og alle eiendeler, oppgaver og historikk permanent.
          Maler du har publisert i fellesbiblioteket vil fortsatt være tilgjengelige for andre —
          fjern publiseringen fra eiendelen først hvis du ønsker å ta dem ned.
        </p>
        {publishedTemplates.length > 0 && (
          <div style={{
            background: 'var(--color-warning-50)', border: '1px solid rgba(245,158,11,.25)',
            borderRadius: 'var(--radius-md)', padding: 'var(--space-3)',
            fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-4)',
          }}>
            <strong>Du har {publishedTemplates.length} publisert{publishedTemplates.length > 1 ? 'e maler' : ' mal'} i biblioteket:</strong>
            <ul style={{ margin: 'var(--space-2) 0 0', paddingLeft: 'var(--space-4)' }}>
              {publishedTemplates.map(t => <li key={t.id}>{t.name}</li>)}
            </ul>
            <p style={{ margin: 'var(--space-2) 0 0', color: 'var(--color-text-muted)' }}>
              Disse vil forbli i biblioteket etter kontosletting. Gå inn på hver eiendel og klikk «Fjern publisering» hvis du vil ta dem ned.
            </p>
          </div>
        )}
        {deleteError && <p style={{ color: 'var(--color-danger-600)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-3)' }}>{deleteError}</p>}
        <Button variant="danger" icon="trash" loading={deletingAccount} onClick={handleDeleteAccount}>
          Slett kontoen min permanent
        </Button>
      </Card>

      {/* Save-error alert (replaces native alert()) */}
      <ConfirmDialog
        open={!!saveError}
        title="Lagring feilet"
        message={saveError}
        infoOnly
        onClose={() => setSaveError(null)}
      />

      {/* Account deletion — step 1: info about published templates */}
      <ConfirmDialog
        open={deleteStep === 'warn-published'}
        title="Du har publiserte maler"
        message={`Du har ${publishedTemplates.length} publisert${publishedTemplates.length !== 1 ? 'e maler' : ' mal'} i fellesbiblioteket.\n\nDe vil forbli tilgjengelige for andre selv etter at kontoen er slettet. Gå inn på hver eiendel og klikk «Fjern publisering» hvis du vil ta dem ned først.`}
        confirmLabel="Fortsett uansett"
        cancelLabel="Avbryt"
        variant="danger"
        onConfirm={() => setDeleteStep('confirm1')}
        onClose={() => setDeleteStep(null)}
      />

      {/* Account deletion — step 2: first danger confirm */}
      <ConfirmDialog
        open={deleteStep === 'confirm1'}
        title="Slett kontoen?"
        message="Alle eiendeler, oppgaver og historikk slettes permanent. Dette kan ikke angres."
        confirmLabel="Ja, slett kontoen"
        cancelLabel="Avbryt"
        variant="danger"
        onConfirm={() => setDeleteStep('confirm2')}
        onClose={() => setDeleteStep(null)}
      />

      {/* Account deletion — step 3: final confirmation */}
      <ConfirmDialog
        open={deleteStep === 'confirm2'}
        title="Siste bekreftelse"
        message="Er du helt sikker? Dette sletter kontoen permanent og kan ikke angres."
        confirmLabel="Slett permanent"
        cancelLabel="Avbryt"
        variant="danger"
        loading={deletingAccount}
        onConfirm={runDeleteAccount}
        onClose={() => setDeleteStep(null)}
      />

      {/* Permanent purge from trash */}
      <ConfirmDialog
        open={!!confirmPurge}
        title="Slett permanent"
        message={`«${confirmPurge?.name}» og all tilhørende historikk slettes permanent. Dette kan ikke angres.`}
        confirmLabel="Slett permanent"
        variant="danger"
        onConfirm={() => purgeAsset(confirmPurge)}
        onClose={() => setConfirmPurge(null)}
      />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}
