// Root component. Owns auth state and hands off routing to React Router.
// URL structure:
//   /               → Home (asset list + dashboard)
//   /assets/:id     → AssetDetail
//   /settings       → Settings
//   /templates      → Templates (public library list)
//   /templates/:id  → TemplateDetail
//
// Auth: onAuthStateChange is the single source of truth (see supabaseClient.js
// for why we don't use getUser()).  If the user is not logged in we render
// <Login> no matter what the URL is; the URL is preserved so that after login
// the router will land on the originally requested page.
import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import Login from './Login.jsx'
import Home from './Home.jsx'
import AssetDetail from './AssetDetail.jsx'
import Settings from './Settings.jsx'
import Templates from './Templates.jsx'
import TemplateDetail from './TemplateDetail.jsx'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // onAuthStateChange fires with INITIAL_SESSION on mount (including when
    // there is a token in the URL hash after a magic-link click), so we use it
    // as the single source of truth and skip the separate getUser() call.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p className="muted">Laster Maintain ...</p>
      </div>
    )
  }

  if (!user) return <Login />

  // BrowserRouter lives inside the auth gate so all route components can safely
  // call useNavigate() without a "no router" error during the loading/login phase.
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/assets/:id" element={<AssetDetail />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="/templates/:id" element={<TemplateDetail />} />
        {/* Catch-all: redirect unknown paths to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
