import { useEffect, useState } from 'react'
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
  const [route, setRoute] = useState({ name: 'home' })

  useEffect(() => {
    // onAuthStateChange fires with INITIAL_SESSION on mount (including when
    // there's a token in the URL hash after a magic-link click), so we use it
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

  if (route.name === 'asset') {
    return <AssetDetail assetId={route.id} onBack={() => setRoute({ name: 'home' })} />
  }
  if (route.name === 'settings') {
    return <Settings onBack={() => setRoute({ name: 'home' })} />
  }
  if (route.name === 'templates') {
    return (
      <Templates
        onBack={() => setRoute({ name: 'home' })}
        onOpen={id => setRoute({ name: 'template', id })}
      />
    )
  }
  if (route.name === 'template') {
    return (
      <TemplateDetail
        templateId={route.id}
        onBack={() => setRoute({ name: 'templates' })}
        onForked={newAssetId => setRoute({ name: 'asset', id: newAssetId })}
      />
    )
  }

  return (
    <Home
      user={user}
      onOpenAsset={id => setRoute({ name: 'asset', id })}
      onOpenSettings={() => setRoute({ name: 'settings' })}
      onOpenTemplates={() => setRoute({ name: 'templates' })}
      onSignOut={() => supabase.auth.signOut()}
    />
  )
}
