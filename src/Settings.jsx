import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import {
  isPushSupported,
  getCurrentSubscription,
  subscribePush,
  unsubscribePush,
} from './push'

export default function Settings({ onBack }) {
  const [prefs, setPrefs] = useState(null)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const [pushStatus, setPushStatus] = useState({
    supported: false,
    permission: 'default',
    subscribed: false,
  })
  const [pushBusy, setPushBusy] = useState(false)
  const [pushError, setPushError] = useState(null)

  useEffect(() => {
    load()
    refreshPushStatus()
  }, [])

  async function load() {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .maybeSingle()
    if (error) {
      console.error(error)
      return alert(error.message)
    }
    if (!data) {
      const { data: user } = await supabase.auth.getUser()
      const { data: created, error: insertErr } = await supabase
        .from('notification_preferences')
        .insert({ user_id: user.user.id })
        .select()
        .single()
      if (insertErr) return alert(insertErr.message)
      setPrefs(created)
      return
    }
    setPrefs(data)
  }

  async function refreshPushStatus() {
    const supported = isPushSupported()
    if (!supported) {
      setPushStatus({ supported: false, permission: 'default', subscribed: false })
      return
    }
    const sub = await getCurrentSubscription()
    setPushStatus({
      supported: true,
      permission: Notification.permission,
      subscribed: !!sub,
    })
  }

  async function handleSubscribe() {
    setPushBusy(true)
    setPushError(null)
    try {
      await subscribePush()
      await refreshPushStatus()
    } catch (e) {
      setPushError(e.message)
    } finally {
      setPushBusy(false)
    }
  }

  async function handleUnsubscribe() {
    setPushBusy(true)
    setPushError(null)
    try {
      await unsubscribePush()
      await refreshPushStatus()
    } catch (e) {
      setPushError(e.message)
    } finally {
      setPushBusy(false)
    }
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
      })
      .eq('user_id', prefs.user_id)
    setSaving(false)
    if (error) return alert(error.message)
    setSavedAt(new Date())
  }

  if (!prefs) return <div style={{ padding: 20 }}>Laster innstillinger...</div>

  return (
    <div style={{ padding: 20, maxWidth: 480, margin: '0 auto' }}>
      <button onClick={onBack}>← Tilbake</button>
      <h1>Innstillinger</h1>

      <h2>Varselkanaler</h2>

      <label style={{ display: 'block', margin: '8px 0' }}>
        <input
          type="checkbox"
          checked={prefs.email_enabled}
          onChange={e => setPrefs({ ...prefs, email_enabled: e.target.checked })}
        />{' '}
        Send e-post når oppgaver nærmer seg forfall
      </label>

      <label style={{ display: 'block', margin: '8px 0' }}>
        <input
          type="checkbox"
          checked={prefs.push_enabled}
          onChange={e => setPrefs({ ...prefs, push_enabled: e.target.checked })}
        />{' '}
        Send push-varsel når oppgaver nærmer seg forfall
      </label>

      <label style={{ display: 'block', margin: '12px 0' }}>
        Varsle{' '}
        <input
          type="number"
          min="0"
          max="60"
          value={prefs.lead_time_days}
          onChange={e => setPrefs({ ...prefs, lead_time_days: Number(e.target.value) })}
          style={{ width: 60 }}
        />{' '}
        dager før forfall
      </label>

      <label style={{ display: 'block', margin: '8px 0' }}>
        Tidssone:{' '}
        <input
          type="text"
          value={prefs.timezone}
          onChange={e => setPrefs({ ...prefs, timezone: e.target.value })}
        />
      </label>

      <button onClick={save} disabled={saving} style={{ marginTop: 12 }}>
        {saving ? 'Lagrer...' : 'Lagre'}
      </button>
      {savedAt && (
        <span style={{ marginLeft: 8, color: 'var(--text)' }}>
          Lagret {savedAt.toLocaleTimeString('nb-NO')}
        </span>
      )}

      <h2 style={{ marginTop: 32 }}>Push på denne enheten</h2>
      {!pushStatus.supported && (
        <p style={{ color: 'var(--text)' }}>
          Denne nettleseren støtter ikke push-varsler. (iOS Safari krever at du legger appen til
          på Hjem-skjermen først.)
        </p>
      )}
      {pushStatus.supported && (
        <>
          <p style={{ color: 'var(--text)', fontSize: '0.9em' }}>
            Status: {pushStatus.subscribed ? 'Registrert' : 'Ikke registrert'} · Tillatelse:{' '}
            {pushStatus.permission}
          </p>
          {!pushStatus.subscribed ? (
            <button onClick={handleSubscribe} disabled={pushBusy}>
              {pushBusy ? 'Registrerer...' : 'Skru på push på denne enheten'}
            </button>
          ) : (
            <button onClick={handleUnsubscribe} disabled={pushBusy}>
              {pushBusy ? 'Avregistrerer...' : 'Skru av push på denne enheten'}
            </button>
          )}
          {pushError && (
            <p style={{ color: '#c0392b', marginTop: 8 }}>{pushError}</p>
          )}
        </>
      )}
    </div>
  )
}
