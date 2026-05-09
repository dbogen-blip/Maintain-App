// Web Push subscription management using VAPID authentication.
// VAPID keys must be generated once (e.g. with web-push generate-vapid-keys)
// and stored in two places:
//   VITE_VAPID_PUBLIC_KEY  — frontend .env.local, passed to pushManager.subscribe()
//   VAPID_PRIVATE_KEY      — Supabase Edge Function secret, used to sign push requests
// The subscription endpoint and keys are stored in the push_subscriptions table
// so the server can send notifications at any time, not just during an open session.

import { supabase } from './supabaseClient'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const b64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export async function getCurrentSubscription() {
  if (!isPushSupported()) return null
  const reg = await navigator.serviceWorker.getRegistration('/sw.js')
  if (!reg) return null
  return reg.pushManager.getSubscription()
}

export async function subscribePush() {
  if (!isPushSupported()) {
    throw new Error('Nettleseren støtter ikke push-varsler.')
  }
  if (!VAPID_PUBLIC_KEY) {
    throw new Error('VITE_VAPID_PUBLIC_KEY mangler i .env.local. Se SETUP.md.')
  }

  // 1. Register the service worker (required for push on all browsers)
  const reg = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready

  // 2. Request notification permission from the browser
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Du må gi tillatelse til varsler i nettleseren.')
  }

  // 3. Get existing subscription or create a new one
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
  }

  // 4. Persist the subscription so the server can push notifications later
  const json = sub.toJSON()
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      user_agent: navigator.userAgent,
    },
    { onConflict: 'endpoint' }
  )
  if (error) throw error
  return sub
}

export async function unsubscribePush() {
  const sub = await getCurrentSubscription()
  if (!sub) return
  const endpoint = sub.endpoint
  await sub.unsubscribe()
  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
}
