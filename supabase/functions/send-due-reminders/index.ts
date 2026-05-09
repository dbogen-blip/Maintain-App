// send-due-reminders
// Kjøres daglig av pg_cron. Finner forfallende oppgaver, sender push (Web Push)
// og e-post (Resend), og logger til notifications_sent for å unngå duplikater.

import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'jsr:@supabase/supabase-js@2'

interface DueTask {
  id: string
  title: string
  next_due: string
  asset_id: string
  asset: { name: string; user_id: string } | { name: string; user_id: string }[]
}

function normalizeAsset(a: DueTask['asset']) {
  return Array.isArray(a) ? a[0] : a
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:noreply@maintain.local'
const RESEND_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'Maintain <onboarding@resend.dev>'
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? ''
// Sett DEBUG=1 i Edge Function-secrets for å få debug-felter i responsen.
const DEBUG = Deno.env.get('DEBUG') === '1'

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)

Deno.serve(async (req) => {
  const auth = req.headers.get('Authorization') ?? ''
  const provided = auth.replace(/^Bearer\s+/i, '')
  if (!CRON_SECRET || (provided !== CRON_SECRET && provided !== SERVICE_ROLE)) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const today = new Date().toISOString().slice(0, 10)
  const horizon = new Date(Date.now() + 60 * 86400 * 1000).toISOString().slice(0, 10)

  const { data: dueTasksRaw, error: tasksErr } = await supabase
    .from('tasks')
    .select('id, title, next_due, asset_id, asset:assets!inner(name, user_id)')
    .not('next_due', 'is', null)
    .lte('next_due', horizon)
    .returns<DueTask[]>()
  if (tasksErr) return jsonError(tasksErr.message, 500)

  if (!dueTasksRaw || dueTasksRaw.length === 0) {
    return Response.json({ ok: true, message: 'Ingen oppgaver innen horisont', push: 0, email: 0 })
  }

  // Normaliser asset (PostgREST kan returnere object eller array)
  const dueTasks = dueTasksRaw.map((t) => ({ ...t, asset: normalizeAsset(t.asset) }))

  const userIds = [...new Set(dueTasks.map((t) => t.asset?.user_id).filter(Boolean))]

  const { data: prefsArr } = await supabase
    .from('notification_preferences')
    .select('*')
    .in('user_id', userIds)
  const prefsByUser = new Map((prefsArr ?? []).map((p) => [p.user_id, p]))

  const dueByUser = new Map<string, typeof dueTasks>()
  for (const t of dueTasks) {
    const userId = t.asset?.user_id
    if (!userId) continue
    const pref = prefsByUser.get(userId)
    if (!pref) continue
    const daysUntil = Math.round(
      (new Date(t.next_due).getTime() - new Date(today).getTime()) / 86400000
    )
    if (daysUntil > pref.lead_time_days) continue
    const list = dueByUser.get(userId) ?? []
    list.push(t)
    dueByUser.set(userId, list)
  }

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('*')
    .in('user_id', userIds)
  const subsByUser = new Map<string, typeof subs>()
  for (const s of subs ?? []) {
    const list = subsByUser.get(s.user_id) ?? []
    list.push(s)
    subsByUser.set(s.user_id, list)
  }

  const { data: sentToday } = await supabase
    .from('notifications_sent')
    .select('task_id, channel, due_date')
    .gte('sent_at', today + 'T00:00:00Z')
  const sentSet = new Set(
    (sentToday ?? []).map((s) => `${s.task_id}|${s.channel}|${s.due_date}`)
  )

  const emailByUser = new Map<string, string>()
  for (const userId of userIds) {
    const { data } = await supabase.auth.admin.getUserById(userId)
    if (data?.user?.email) emailByUser.set(userId, data.user.email)
  }

  let pushSent = 0
  let emailSent = 0
  const errors: string[] = []

  for (const [userId, tasks] of dueByUser) {
    const pref = prefsByUser.get(userId)!

    if (pref.push_enabled) {
      const userSubs = subsByUser.get(userId) ?? []
      for (const t of tasks) {
        const key = `${t.id}|push|${t.next_due}`
        if (sentSet.has(key)) continue

        let anySuccess = false
        for (const sub of userSubs) {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              JSON.stringify({
                title: `Vedlikehold: ${t.asset?.name ?? ''}`,
                body: `${t.title} forfaller ${t.next_due}`,
                tag: `task-${t.id}`,
                // Deep-link to the specific asset so the user lands directly
                // on the relevant maintenance log when tapping the notification.
                url: `/?asset=${t.asset_id}`,
              })
            )
            pushSent++
            anySuccess = true
          } catch (e: unknown) {
            const err = e as { statusCode?: number; message?: string }
            errors.push(`push ${userId}: ${err.message ?? e}`)
            if (err.statusCode === 404 || err.statusCode === 410) {
              await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
            }
          }
        }
        if (anySuccess) {
          await supabase.from('notifications_sent').insert({
            user_id: userId,
            task_id: t.id,
            channel: 'push',
            due_date: t.next_due,
          })
        }
      }
    }

    if (pref.email_enabled && RESEND_KEY) {
      const email = emailByUser.get(userId)
      if (!email) continue

      const unsent = tasks.filter(
        (t) => !sentSet.has(`${t.id}|email|${t.next_due}`)
      )
      if (unsent.length === 0) continue

      const html = `
        <h1 style="font-family: system-ui">Vedlikehold som forfaller snart</h1>
        <ul style="font-family: system-ui; line-height: 1.6">
          ${unsent
            .map(
              (t) =>
                `<li><strong>${escapeHtml(t.asset?.name ?? '')}</strong>: ${escapeHtml(t.title)} — forfaller ${t.next_due}</li>`
            )
            .join('')}
        </ul>
      `

      try {
        const resp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${RESEND_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: email,
            subject: `Vedlikehold: ${unsent.length} oppgave${unsent.length === 1 ? '' : 'r'} forfaller snart`,
            html,
          }),
        })
        if (!resp.ok) throw new Error(`Resend ${resp.status}: ${await resp.text()}`)
        emailSent++
        for (const t of unsent) {
          await supabase.from('notifications_sent').insert({
            user_id: userId,
            task_id: t.id,
            channel: 'email',
            due_date: t.next_due,
          })
        }
      } catch (e) {
        errors.push(`email ${userId}: ${(e as Error).message}`)
      }
    }
  }

  const body: Record<string, unknown> = {
    ok: true,
    push: pushSent,
    email: emailSent,
    users: dueByUser.size,
    errors,
  }
  if (DEBUG) {
    body.debug = {
      dueTasksFound: dueTasks.length,
      userIdsCount: userIds.length,
      prefsByUserCount: prefsByUser.size,
      subsByUserCount: subsByUser.size,
      sentTodayCount: sentSet.size,
      dueByUserDetail: [...dueByUser.entries()].map(([uid, ts]) => ({
        user_id: uid,
        task_count: ts.length,
        tasks: ts.map((t) => ({ id: t.id, title: t.title, next_due: t.next_due })),
        pref_push_enabled: prefsByUser.get(uid)?.push_enabled,
        pref_lead_time: prefsByUser.get(uid)?.lead_time_days,
        sub_count: (subsByUser.get(uid) ?? []).length,
      })),
    }
  }
  return Response.json(body)
})

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
