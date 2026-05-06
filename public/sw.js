// Maintain – service worker for Web Push
// Tar imot push-meldinger fra send-due-reminders og viser system-notifikasjoner.

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { title: 'Maintain', body: event.data ? event.data.text() : '' }
  }

  const title = payload.title || 'Maintain'
  const options = {
    body: payload.body || 'Du har vedlikeholdsoppgaver som forfaller snart.',
    icon: payload.icon || '/favicon.svg',
    badge: '/favicon.svg',
    tag: payload.tag || 'maintain-due',
    renotify: true,
    data: { url: payload.url || '/' },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/'
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of allClients) {
        if ('focus' in client) {
          await client.focus()
          if ('navigate' in client) await client.navigate(targetUrl)
          return
        }
      }
      await self.clients.openWindow(targetUrl)
    })()
  )
})
