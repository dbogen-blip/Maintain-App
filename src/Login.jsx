import { useState } from 'react'
import { supabase } from './supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  async function handleLogin() {
    const { error } = await supabase.auth.signInWithOtp({
      email
    })

    if (error) {
      alert(error.message)
    } else {
      setSent(true)
    }
  }

  if (sent) {
    return <p>Sjekk e-posten din for login-link.</p>
  }

  return (
    <div>
      <input
        placeholder="E-post"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <button onClick={handleLogin}>
        Send login-link
      </button>
    </div>
  )
}