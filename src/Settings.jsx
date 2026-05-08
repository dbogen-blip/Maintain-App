import { useEffect, useState } from 'react'
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

export default function Settings({ onBack }) {
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

  useEffect(() => {
    load()
    refreshPushStatus()
  }, [])

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
    if (error) return alert(error.message)
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
      <Button variant="ghost" icon="arrowLeft" onClick={onBack}>Tilbake</Button>

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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
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

      <Card padding={5}>
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
    </div>
  )
}
