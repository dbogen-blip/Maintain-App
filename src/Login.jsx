// Login screen with two authentication modes.
// Primary mode (OTP / magic link): signInWithOtp sends an email containing
//   both an 8-digit code and a clickable magic link. The user types the code
//   into this screen so login completes on the current device — no browser
//   switching required. verifyOtp authenticates with the typed code directly.
// Secondary mode (password): standard email+password sign-in and sign-up.
import { useState } from 'react'
import { supabase } from './supabaseClient'
import Card from './components/Card'
import { Input } from './components/Input'
import Button from './components/Button'
import Icon from './components/Icon'

function SegmentedControl({ value, onChange, options }) {
  return (
    <div style={{
      display: 'flex',
      background: 'var(--color-surface-alt)',
      borderRadius: 'var(--radius-lg)',
      padding: 3,
      marginBottom: 'var(--space-5)',
    }}>
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          style={{
            flex: 1,
            padding: '8px 12px',
            border: 'none',
            borderRadius: 'calc(var(--radius-lg) - 1px)',
            background: value === opt.value ? 'var(--color-surface)' : 'transparent',
            fontWeight: value === opt.value ? 'var(--font-weight-semibold)' : 'var(--font-weight-normal)',
            color: 'var(--color-text)',
            cursor: 'pointer',
            fontSize: 'var(--font-size-sm)',
            boxShadow: value === opt.value ? 'var(--shadow-sm)' : 'none',
            transition: 'all 0.15s',
            fontFamily: 'inherit',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <Icon name={opt.icon} size={14} />
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export default function Login() {
  const [mode, setMode] = useState('magic')   // 'magic' | 'password'
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState(null)

  function switchMode(m) {
    setMode(m)
    setError(null)
    setIsSignUp(false)
    setPassword('')
    setConfirmPassword('')
  }

  async function handleMagicLink(e) {
    e.preventDefault()
    setLoading(true); setError(null)
    const { error } = await supabase.auth.signInWithOtp({ email })
    setLoading(false)
    if (error) setError(error.message)
    else setSent(true)
  }

  async function handleVerifyOtp(e) {
    e.preventDefault()
    setVerifying(true); setError(null)
    const { error } = await supabase.auth.verifyOtp({ email, token: otp.trim(), type: 'email' })
    setVerifying(false)
    if (error) setError('Feil kode eller koden er utløpt. Prøv igjen.')
  }

  async function handlePassword(e) {
    e.preventDefault()
    setError(null)
    if (password.length < 6) { setError('Passordet må være minst 6 tegn'); return }
    if (isSignUp && password !== confirmPassword) { setError('Passordene stemmer ikke overens'); return }
    setLoading(true)
    const { data, error: authErr } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (authErr) {
      setError(authErr.message === 'Invalid login credentials'
        ? 'Feil e-post eller passord'
        : authErr.message)
    } else if (isSignUp && !data.session) {
      setSent(true)
    }
  }

  const logo = (
    <div style={{ textAlign: 'center', marginBottom: 'var(--space-5)' }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 56, height: 56, borderRadius: 'var(--radius-xl)',
        background: 'var(--color-navy)', color: '#fff',
        marginBottom: 'var(--space-3)', boxShadow: 'var(--shadow-md)',
      }}>
        <Icon name="wrench" size={28} />
      </div>
      <h1 style={{ marginBottom: 'var(--space-1)' }}>Maintain</h1>
      <p className="muted">Aldri glem viktig vedlikehold igjen.</p>
    </div>
  )

  if (sent) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-4)', background: 'var(--color-bg)' }}>
        <Card padding={6} style={{ width: '100%', maxWidth: 400 }}>
          {logo}
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-4)' }}>
            <div style={{
              display: 'inline-flex', width: 48, height: 48, borderRadius: '50%',
              background: 'var(--color-success-50)', color: 'var(--color-success)',
              alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-3)',
            }}>
              <Icon name="mail" size={24} />
            </div>
            <p style={{ marginBottom: 'var(--space-1)', fontWeight: 'var(--font-weight-semibold)' }}>
              Sjekk e-posten din
            </p>
            <p className="muted" style={{ fontSize: 'var(--font-size-sm)' }}>
              Vi sendte en 8-sifret kode til <strong>{email}</strong>.
              Skriv den inn her — ingen grunn til å bytte enhet.
            </p>
          </div>

          <form onSubmit={handleVerifyOtp}>
            <div className="field">
              <label>Engangskode</label>
              <input
                className="input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                placeholder="12345678"
                value={otp}
                onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setError(null) }}
                autoFocus
                style={{
                  width: '100%',
                  textAlign: 'center',
                  fontSize: 28,
                  letterSpacing: '0.25em',
                  fontVariantNumeric: 'tabular-nums',
                }}
              />
            </div>
            {error && (
              <p style={{ color: 'var(--color-danger-700)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-3)' }}>
                {error}
              </p>
            )}
            <Button type="submit" loading={verifying} style={{ width: '100%' }} disabled={otp.length < 6 || verifying}>
              Logg inn
            </Button>
          </form>

          <p className="muted" style={{ fontSize: 'var(--font-size-xs)', textAlign: 'center', marginTop: 'var(--space-4)' }}>
            Kom ikke e-post?{' '}
            <button
              type="button"
              onClick={() => { setSent(false); setOtp(''); setError(null) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text)', fontWeight: 'var(--font-weight-semibold)', fontSize: 'inherit', padding: 0, fontFamily: 'inherit', textDecoration: 'underline' }}
            >
              Send på nytt
            </button>
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-4)', background: 'var(--color-bg)' }}>
      <Card padding={6} style={{ width: '100%', maxWidth: 400 }}>
        {logo}

        <SegmentedControl
          value={mode}
          onChange={switchMode}
          options={[
            { value: 'magic', label: 'Innloggingslenke', icon: 'mail' },
            { value: 'password', label: 'Passord', icon: 'lock' },
          ]}
        />

        {mode === 'magic' ? (
          <form onSubmit={handleMagicLink}>
            <Input
              label="E-post"
              type="email"
              placeholder="navn@eksempel.no"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />
            {error && <p style={{ color: 'var(--color-danger-700)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-3)' }}>{error}</p>}
            <Button type="submit" loading={loading} style={{ width: '100%' }}>
              Send innloggingslenke
            </Button>
            <p className="muted" style={{ fontSize: 'var(--font-size-xs)', textAlign: 'center', marginTop: 'var(--space-3)' }}>
              Ingen passord nødvendig. Vi sender deg en sikker lenke.
            </p>
          </form>
        ) : (
          <form onSubmit={handlePassword}>
            <Input
              label="E-post"
              type="email"
              placeholder="navn@eksempel.no"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />
            <div style={{ position: 'relative' }}>
              <Input
                label="Passord"
                type={showPassword ? 'text' : 'password'}
                placeholder="Minst 6 tegn"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                style={{
                  position: 'absolute', right: 14, top: 34,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-text-muted)', padding: 0, lineHeight: 1,
                }}
                tabIndex={-1}
              >
                <Icon name={showPassword ? 'eyeOff' : 'eye'} size={18} />
              </button>
            </div>
            {isSignUp && (
              <Input
                label="Bekreft passord"
                type={showPassword ? 'text' : 'password'}
                placeholder="Gjenta passordet"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
              />
            )}
            {error && <p style={{ color: 'var(--color-danger-700)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-3)' }}>{error}</p>}
            <Button type="submit" loading={loading} style={{ width: '100%' }}>
              {isSignUp ? 'Opprett konto' : 'Logg inn'}
            </Button>
            <p style={{ textAlign: 'center', marginTop: 'var(--space-3)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
              {isSignUp ? 'Har du allerede konto?' : 'Ny bruker?'}{' '}
              <button
                type="button"
                onClick={() => { setIsSignUp(v => !v); setError(null) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text)', fontWeight: 'var(--font-weight-semibold)', fontSize: 'inherit', padding: 0, fontFamily: 'inherit' }}
              >
                {isSignUp ? 'Logg inn' : 'Registrer deg'}
              </button>
            </p>
          </form>
        )}
      </Card>
    </div>
  )
}
