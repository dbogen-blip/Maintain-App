import { useEffect, useState } from 'react'
import Login from './Login'
import Settings from './Settings'
import { supabase } from './supabaseClient'
import './App.css'

function daysUntil(dateStr) {
  if (!dateStr) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.round((target - today) / 86400000)
}

function dueLabel(task) {
  if (!task.next_due) return 'Aldri utført'
  const d = daysUntil(task.next_due)
  if (d < 0) return `Forfalt for ${-d} dager siden`
  if (d === 0) return 'Forfaller i dag'
  if (d === 1) return 'Forfaller i morgen'
  return `Forfaller om ${d} dager`
}

function dueColor(task) {
  if (!task.next_due) return '#888'
  const d = daysUntil(task.next_due)
  if (d < 0) return '#c0392b'
  if (d <= 7) return '#d68910'
  return '#196f3d'
}

export default function App() {
  const [user, setUser] = useState(null)
  const [assets, setAssets] = useState([])
  const [view, setView] = useState('home')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      if (data.user) fetchAssets()
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchAssets()
      else setAssets([])
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function fetchAssets() {
    const { data, error } = await supabase
      .from('assets')
      .select(`
        id, name, category, description,
        tasks ( id, title, interval_days, last_done, next_due, priority, notes,
          maintenance_logs ( id, performed_on, notes, cost )
        )
      `)
      .order('name', { ascending: true })

    if (error) {
      console.error(error)
      alert(error.message)
      return
    }
    // Sort tasks by next_due (nulls last)
    for (const a of data ?? []) {
      a.tasks?.sort((x, y) => {
        if (!x.next_due) return 1
        if (!y.next_due) return -1
        return x.next_due.localeCompare(y.next_due)
      })
      for (const t of a.tasks ?? []) {
        t.maintenance_logs?.sort((x, y) => y.performed_on.localeCompare(x.performed_on))
      }
    }
    setAssets(data ?? [])
  }

  async function addAsset() {
    const name = prompt('Navn på eiendel (f.eks. "Gressklipper")')
    if (!name) return
    const category = prompt('Kategori (valgfritt: bil, hage, sykkel ...)') || null

    const { error } = await supabase.from('assets').insert({ name, category })
    if (error) return alert(error.message)
    fetchAssets()
  }

  async function deleteAsset(assetId) {
    if (!confirm('Slette eiendelen og alle oppgaver/historikk?')) return
    const { error } = await supabase.from('assets').delete().eq('id', assetId)
    if (error) return alert(error.message)
    fetchAssets()
  }

  async function addTask(assetId) {
    const title = prompt('Hva skal gjøres? (f.eks. "Oljeskift")')
    if (!title) return
    const intervalDays = prompt('Hvor ofte? Antall dager (f.eks. 180)')
    if (!intervalDays || isNaN(Number(intervalDays))) return alert('Ugyldig intervall')

    const { error } = await supabase.from('tasks').insert({
      asset_id: assetId,
      title,
      interval_days: Number(intervalDays),
      last_done: new Date().toISOString().slice(0, 10),
    })
    if (error) return alert(error.message)
    fetchAssets()
  }

  async function markDone(task) {
    const performedOn = prompt('Når ble dette utført? (YYYY-MM-DD, tom for i dag)') ||
      new Date().toISOString().slice(0, 10)
    const notes = prompt('Notater (valgfritt)') || null

    const { error } = await supabase.from('maintenance_logs').insert({
      task_id: task.id,
      asset_id: assets.find(a => a.tasks.some(t => t.id === task.id))?.id,
      performed_on: performedOn,
      notes,
    })
    if (error) return alert(error.message)
    fetchAssets()
  }

  async function deleteTask(taskId) {
    if (!confirm('Slette oppgaven og all historikk?')) return
    const { error } = await supabase.from('tasks').delete().eq('id', taskId)
    if (error) return alert(error.message)
    fetchAssets()
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  if (loading) return <div style={{ padding: 20 }}>Laster...</div>

  if (!user) {
    return (
      <div style={{ padding: 20, maxWidth: 480, margin: '0 auto' }}>
        <h1>Maintain</h1>
        <Login />
      </div>
    )
  }

  if (view === 'settings') {
    return <Settings onBack={() => setView('home')} />
  }

  return (
    <div style={{ padding: 20, maxWidth: 720, margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Maintain</h1>
        <div>
          <button onClick={() => setView('settings')}>Innstillinger</button>{' '}
          <button onClick={signOut}>Logg ut</button>
        </div>
      </header>
      <p style={{ color: 'var(--text)' }}>Innlogget som {user.email}</p>

      <div style={{ margin: '16px 0' }}>
        <button onClick={addAsset}>+ Legg til eiendel</button>
      </div>

      {assets.length === 0 && <p>Ingen eiendeler enda. Legg til din første!</p>}

      {assets.map(asset => (
        <section key={asset.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h2 style={{ margin: 0 }}>
              {asset.name}
              {asset.category && <span style={{ color: 'var(--text)', fontWeight: 'normal', fontSize: '0.85em' }}> · {asset.category}</span>}
            </h2>
            <button onClick={() => deleteAsset(asset.id)} style={{ fontSize: '0.85em' }}>Slett</button>
          </div>

          <button onClick={() => addTask(asset.id)} style={{ marginTop: 8 }}>+ Vedlikeholdsoppgave</button>

          {asset.tasks?.length === 0 && <p style={{ color: 'var(--text)', marginTop: 8 }}>Ingen oppgaver enda.</p>}

          {asset.tasks?.map(task => (
            <div key={task.id} style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <strong>{task.title}</strong>
                <button onClick={() => deleteTask(task.id)} style={{ fontSize: '0.85em' }}>Slett</button>
              </div>
              <div style={{ fontSize: '0.9em', color: dueColor(task) }}>{dueLabel(task)}</div>
              <div style={{ fontSize: '0.85em', color: 'var(--text)' }}>
                Hver {task.interval_days} dag · sist utført {task.last_done ?? 'aldri'}
              </div>
              <button onClick={() => markDone(task)} style={{ marginTop: 6 }}>Marker som utført</button>

              {task.maintenance_logs?.length > 0 && (
                <details style={{ marginTop: 6 }}>
                  <summary style={{ fontSize: '0.85em', cursor: 'pointer' }}>
                    Historikk ({task.maintenance_logs.length})
                  </summary>
                  <ul style={{ fontSize: '0.85em', color: 'var(--text)' }}>
                    {task.maintenance_logs.map(log => (
                      <li key={log.id}>
                        {log.performed_on}
                        {log.notes && ` — ${log.notes}`}
                        {log.cost != null && ` (kr ${log.cost})`}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}
