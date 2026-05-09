// Prompts the user to install Maintain as a home screen app.
//
// Android/Chrome: the browser fires a `beforeinstallprompt` event which we
// capture and use to show a native install dialog on demand.
//
// iOS Safari: no API exists to trigger the prompt — we show a manual guide
// with a picture of the Share button instead.
//
// The banner is suppressed when:
//   - The app is already running in standalone mode (already installed)
//   - The user has dismissed it (stored in localStorage under 'install-dismissed')
import { useEffect, useState } from 'react'

const STORAGE_KEY = 'install-dismissed'

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
}

function isAndroidChrome() {
  return /Android/.test(navigator.userAgent) && /Chrome/.test(navigator.userAgent)
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null) // Android install event
  const [showIOS, setShowIOS]               = useState(false)
  const [visible, setVisible]               = useState(false)
  const [showIOSGuide, setShowIOSGuide]     = useState(false)

  useEffect(() => {
    // Don't show if already installed or previously dismissed
    if (isStandalone() || localStorage.getItem(STORAGE_KEY)) return

    if (isIOS()) {
      setShowIOS(true)
      setVisible(true)
      return
    }

    // Android/Chrome: listen for the install eligibility event
    const handler = (e) => {
      e.preventDefault() // prevent automatic mini-infobar
      setDeferredPrompt(e)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }

  async function handleInstallAndroid() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      localStorage.setItem(STORAGE_KEY, '1')
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <>
      {/* Banner */}
      <div style={{
        background: 'var(--color-navy)',
        color: '#fff',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        fontSize: 'var(--font-size-sm)',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 'var(--radius-md)',
          background: 'rgba(255,255,255,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
          </svg>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600 }}>Legg Maintain til på hjemskjermen</div>
          <div style={{ opacity: 0.75, fontSize: 'var(--font-size-xs)', marginTop: 2 }}>
            {showIOS ? 'Trykk på Del-knappen, deretter «Legg til på hjemskjerm»' : 'Rask tilgang — fungerer som en app'}
          </div>
        </div>

        {showIOS ? (
          <button
            type="button"
            onClick={() => setShowIOSGuide(true)}
            style={{
              background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
              padding: '6px 12px', borderRadius: 'var(--radius-md)',
              fontSize: 'var(--font-size-xs)', fontWeight: 600,
              cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit',
              flexShrink: 0,
            }}
          >
            Vis meg
          </button>
        ) : (
          <button
            type="button"
            onClick={handleInstallAndroid}
            style={{
              background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
              padding: '6px 12px', borderRadius: 'var(--radius-md)',
              fontSize: 'var(--font-size-xs)', fontWeight: 600,
              cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit',
              flexShrink: 0,
            }}
          >
            Installer
          </button>
        )}

        <button
          type="button"
          onClick={dismiss}
          aria-label="Lukk"
          style={{
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)',
            cursor: 'pointer', padding: 4, lineHeight: 1, flexShrink: 0,
            fontFamily: 'inherit',
          }}
        >
          ✕
        </button>
      </div>

      {/* iOS guide modal */}
      {showIOSGuide && (
        <div
          onClick={() => setShowIOSGuide(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'flex-end',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
              padding: '24px 24px calc(24px + env(safe-area-inset-bottom))',
              width: '100%',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            <h2 style={{ marginBottom: 4 }}>Legg til på hjemskjermen</h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', marginBottom: 24 }}>
              Følg disse tre stegene i Safari:
            </p>

            {[
              {
                step: '1',
                icon: (
                  // iOS Share icon
                  <svg xmlns="http://www.w3.org/2000/svg" width={22} height={22} viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/>
                  </svg>
                ),
                text: 'Trykk på Del-knappen nederst i Safari (firkant med pil opp)',
              },
              {
                step: '2',
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" width={22} height={22} viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8M8 12h8"/>
                  </svg>
                ),
                text: 'Scroll ned og trykk «Legg til på hjemskjerm»',
              },
              {
                step: '3',
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" width={22} height={22} viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5"/>
                  </svg>
                ),
                text: 'Trykk «Legg til» øverst til høyre — ferdig!',
              },
            ].map(({ step, icon, text }) => (
              <div key={step} style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: 'var(--color-surface-alt)',
                  border: '1px solid var(--color-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, color: 'var(--color-text)',
                }}>
                  {icon}
                </div>
                <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text)' }}>{text}</p>
              </div>
            ))}

            <button
              type="button"
              onClick={() => { setShowIOSGuide(false); dismiss() }}
              style={{
                width: '100%', padding: '12px',
                background: 'var(--color-navy)', color: '#fff',
                border: 'none', borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-sm)', fontWeight: 600,
                cursor: 'pointer', marginTop: 8, fontFamily: 'inherit',
              }}
            >
              Forstått
            </button>
          </div>
        </div>
      )}
    </>
  )
}
