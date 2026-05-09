// Supabase client singleton shared across the entire app.
// Auth is configured for cross-device magic-link login:
//   flowType 'implicit' embeds the token directly in the URL hash, so any
//   browser/device that opens the link can authenticate immediately.
//   PKCE (the alternative) stores a code_verifier in the originating browser's
//   localStorage, which breaks login when the user opens the link on a different
//   device or browser tab.
//   detectSessionInUrl: true ensures the #access_token hash is parsed and a
//   session is established when the magic-link URL is loaded.
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase env vars. Sjekk at .env.local har VITE_SUPABASE_URL og VITE_SUPABASE_PUBLISHABLE_KEY.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    flowType: 'implicit',
    detectSessionInUrl: true,
    persistSession: true,
  },
})
