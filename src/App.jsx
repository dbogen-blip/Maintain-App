// Root component. Owns auth state and hands off routing to React Router.
// URL structure:
//   /               → Home (asset list + dashboard)
//   /assets/:id     → AssetDetail
//   /assets/:id/export → AssetExport (print-optimised service history)
//   /settings       → Settings
//   /templates      → Templates (public library list)
//   /templates/:id  → TemplateDetail
//
// Auth: onAuthStateChange is the single source of truth (see supabaseClient.js
// for why we don't use getUser()).  If the user is not logged in we render
// <Login> no matter what the URL is; the URL is preserved so that after login
// the router will land on the originally requested page.
//
// Bundle splitting: Home and AssetDetail are on the critical path and loaded
// eagerly.  Settings, Templates, TemplateDetail and AssetExport are lazy so
// they land in separate chunks and are only fetched when the user navigates
// there for the first time.
import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import Login from './Login.jsx'
import Home from './Home.jsx'
import AssetDetail from './AssetDetail.jsx'

// Lazy-loaded routes — each becomes its own JS chunk in the build
const AssetExport    = lazy(() => import('./AssetExport.jsx'))
const Settings       = lazy(() => import('./Settings.jsx'))
const Templates      = lazy(() => import('./Templates.jsx'))
const TemplateDetail = lazy(() => import('./TemplateDetail.jsx'))

// Minimal fallback shown while a lazy chunk is downloading.
// Matches the style of the app-level loading state (line ~41).
function RouteLoading() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <p className="muted">Laster ...</p>
    </div>
  )
}

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
      <Suspense fallback={<RouteLoading />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/assets/:id" element={<AssetDetail />} />
          <Route path="/assets/:id/export" element={<AssetExport />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/templates/:id" element={<TemplateDetail />} />
          {/* Catch-all: redirect unknown paths to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
