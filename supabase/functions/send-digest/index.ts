// send-digest
// Kjøres daglig av pg_cron (samme secret som send-due-reminders).
// Sender ukentlig sammendrag mandag og månedlig sammendrag 1. i måneden.
// Inneholder: forfalt vedlikehold + kommende oppgaver (7 / 30 dager).

import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_KEY    = Deno.env.get('RESEND_API_KEY') ?? ''
const FROM_EMAIL    = Deno.env.get('FROM_EMAIL') ?? 'Maintain <onboarding@resend.dev>'
const CRON_SECRET   = Deno.env.get('CRON_SECRET') ?? ''

interface Task {
  id: string
  title: string
  next_due: string | null
  fixed_due_date: string | null
  asset_id: string
  effectiveDue: string
  assetName: string
}

Deno.serve(async (req) => {
  const auth     = req.headers.get('Authorization') ?? ''
  const provided = auth.replace(/^Bearer\s+/i, '')
  if (!CRON_SECRET || (provided !== CRON_SECRET && provided !== SERVICE_ROLE)) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // Bestem Oslo-dato (UTC+1, ignorerer DST for enkelhets skyld)
  const now  = new Date(Date.now() + 60 * 60000)
  const dow  = now.getUTCDay()   // 0=Søn, 1=Man
  const dom  = now.getUTCDate()  // 1–31
  const today = now.toISOString().slice(0, 10)

  const force = new URL(req.url).searchParams.get('force') === 'true'

  const sendWeekly  = force || dow === 1  // Mandager
  const sendMonthly = force || dom === 1  // 1. i måneden

  if (!sendWeekly && !sendMonthly) {
    return Response.json({ ok: true, skipped: true, dow, dom })
  }

  // Hent brukere som vil ha sammendrag i dag
  const freqFilter = force
    ? 'digest_frequency.eq.weekly,digest_frequency.eq.monthly'
    : [
        sendWeekly  ? 'digest_frequency.eq.weekly'  : null,
        sendMonthly ? 'digest_frequency.eq.monthly' : null,
      ].filter(Boolean).join(',')

  const { data: prefs, error: prefsErr } = await supabase
    .from('notification_preferences')
    .select('*')
    .or(freqFilter)

  if (prefsErr) return jsonError(prefsErr.message, 500)
  if (!prefs?.length) return Response.json({ ok: true, sent: 0 })

  let sent = 0
  const errors: string[] = []

  for (const pref of prefs) {
    try {
      const isMonthly  = pref.digest_frequency === 'monthly'
      const horizonDays = isMonthly ? 30 : 7
      const horizon = new Date(now.getTime() + horizonDays * 86400000).toISOString().slice(0, 10)

      // Hent brukerens eiendeler
      const { data: assets } = await supabase
        .from('assets')
        .select('id, name')
        .eq('user_id', pref.user_id)
      if (!assets?.length) continue

      const assetIds  = assets.map(a => a.id)
      const assetMap  = new Map(assets.map(a => [a.id, a.name]))

      // Hent oppgaver: forfalt og kommende innen horisont
      // Effektiv forfallsdato = fixed_due_date ?? next_due
      const { data: rawTasks } = await supabase
        .from('tasks')
        .select('id, title, next_due, fixed_due_date, asset_id')
        .in('asset_id', assetIds)
        .or(`fixed_due_date.lte.${horizon},and(fixed_due_date.is.null,next_due.lte.${horizon})`)

      const tasks: Task[] = (rawTasks ?? [])
        .map(t => ({
          ...t,
          effectiveDue: (t.fixed_due_date ?? t.next_due) as string,
          assetName: assetMap.get(t.asset_id) ?? '',
        }))
        .filter(t => t.effectiveDue)

      const overdue  = tasks.filter(t => t.effectiveDue < today)
        .sort((a, b) => a.effectiveDue.localeCompare(b.effectiveDue))
      const upcoming = tasks.filter(t => t.effectiveDue >= today)
        .sort((a, b) => a.effectiveDue.localeCompare(b.effectiveDue))

      if (!overdue.length && !upcoming.length) continue

      // Hent e-postadresse
      const { data: ud } = await supabase.auth.admin.getUserById(pref.user_id)
      const email = ud?.user?.email
      if (!email) continue

      const period  = isMonthly ? 'månedlig' : 'ukentlig'
      const subject = buildSubject(overdue.length, upcoming.length, period)
      const html    = buildHtml(overdue, upcoming, today, period, isMonthly ? horizon : undefined)

      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: FROM_EMAIL, to: email, subject, html }),
      })
      if (!resp.ok) throw new Error(`Resend ${resp.status}: ${await resp.text()}`)
      sent++
    } catch (e) {
      errors.push(`${pref.user_id}: ${(e as Error).message}`)
    }
  }

  return Response.json({ ok: true, sent, errors })
})

// ─── Hjelpere ────────────────────────────────────────────────────────────────

function buildSubject(overdueCount: number, upcomingCount: number, period: string): string {
  const parts: string[] = []
  if (overdueCount > 0)  parts.push(`${overdueCount} forfalt`)
  if (upcomingCount > 0) parts.push(`${upcomingCount} kommende`)
  return `Maintain ${period} sammendrag — ${parts.join(', ')}`
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  const months = ['jan','feb','mar','apr','mai','jun','jul','aug','sep','okt','nov','des']
  return `${parseInt(d)}. ${months[parseInt(m) - 1]} ${y}`
}

function esc(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

function taskRows(tasks: Task[]): string {
  return tasks.map(t => `
    <tr>
      <td style="padding:10px 12px; border-bottom:1px solid #F0F0F0; font-size:14px; color:#222">
        ${esc(t.title)}
      </td>
      <td style="padding:10px 12px; border-bottom:1px solid #F0F0F0; font-size:14px; color:#717171; white-space:nowrap">
        ${esc(t.assetName)}
      </td>
      <td style="padding:10px 12px; border-bottom:1px solid #F0F0F0; font-size:14px; color:#717171; white-space:nowrap; text-align:right">
        ${formatDate(t.effectiveDue)}
      </td>
    </tr>`).join('')
}

function buildHtml(
  overdue: Task[],
  upcoming: Task[],
  today: string,
  period: string,
  horizon?: string,
): string {
  const overdueSection = overdue.length === 0 ? '' : `
    <div style="margin:24px 0 0">
      <div style="background:#FEF2F2; border-left:4px solid #EF4444; border-radius:6px; padding:14px 18px; margin-bottom:12px">
        <span style="font-weight:700; color:#991B1B; font-size:15px">
          ⚠️ Forfalt vedlikehold (${overdue.length})
        </span>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; border:1px solid #E8E8E8; border-radius:8px; overflow:hidden">
        <thead>
          <tr style="background:#F7F7F7">
            <th style="padding:10px 12px; text-align:left; font-size:12px; color:#717171; font-weight:600; text-transform:uppercase; letter-spacing:.04em">Oppgave</th>
            <th style="padding:10px 12px; text-align:left; font-size:12px; color:#717171; font-weight:600; text-transform:uppercase; letter-spacing:.04em">Eiendel</th>
            <th style="padding:10px 12px; text-align:right; font-size:12px; color:#717171; font-weight:600; text-transform:uppercase; letter-spacing:.04em">Forfalt</th>
          </tr>
        </thead>
        <tbody>${taskRows(overdue)}</tbody>
      </table>
    </div>`

  const upcomingLabel = horizon
    ? `Kommende (${formatDate(today)} – ${formatDate(horizon)})`
    : `Denne uken (${formatDate(today)} – ${formatDate(
        new Date(new Date(today).getTime() + 6 * 86400000).toISOString().slice(0,10)
      )})`

  const upcomingSection = upcoming.length === 0 ? '' : `
    <div style="margin:24px 0 0">
      <div style="background:#F0FDF4; border-left:4px solid #22C55E; border-radius:6px; padding:14px 18px; margin-bottom:12px">
        <span style="font-weight:700; color:#166534; font-size:15px">
          ✅ ${esc(upcomingLabel)} (${upcoming.length})
        </span>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; border:1px solid #E8E8E8; border-radius:8px; overflow:hidden">
        <thead>
          <tr style="background:#F7F7F7">
            <th style="padding:10px 12px; text-align:left; font-size:12px; color:#717171; font-weight:600; text-transform:uppercase; letter-spacing:.04em">Oppgave</th>
            <th style="padding:10px 12px; text-align:left; font-size:12px; color:#717171; font-weight:600; text-transform:uppercase; letter-spacing:.04em">Eiendel</th>
            <th style="padding:10px 12px; text-align:right; font-size:12px; color:#717171; font-weight:600; text-transform:uppercase; letter-spacing:.04em">Forfaller</th>
          </tr>
        </thead>
        <tbody>${taskRows(upcoming)}</tbody>
      </table>
    </div>`

  const allGoodSection = (!overdue.length && !upcoming.length) ? `
    <div style="text-align:center; padding:40px 0; color:#717171">
      <div style="font-size:40px">🎉</div>
      <p style="margin:8px 0 0; font-size:15px">Alt er i orden — ingen oppgaver å vise.</p>
    </div>` : ''

  return `<!DOCTYPE html>
<html lang="no">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0; padding:0; background:#F7F7F7; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:600px; margin:32px auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 1px 4px rgba(0,0,0,.08)">

    <!-- Header -->
    <div style="background:#222222; padding:28px 32px; display:flex; align-items:center; gap:14px">
      <div style="background:#ffffff22; border-radius:10px; width:44px; height:44px; display:flex; align-items:center; justify-content:center; font-size:22px; flex-shrink:0">🔧</div>
      <div>
        <div style="color:#ffffff; font-size:20px; font-weight:700; line-height:1.2">Maintain</div>
        <div style="color:#aaaaaa; font-size:13px; margin-top:2px; text-transform:capitalize">${esc(period)} vedlikeholdssammendrag</div>
      </div>
    </div>

    <!-- Content -->
    <div style="padding:24px 32px 32px">
      ${overdueSection}
      ${upcomingSection}
      ${allGoodSection}
    </div>

    <!-- Footer -->
    <div style="border-top:1px solid #F0F0F0; padding:20px 32px; background:#FAFAFA">
      <p style="margin:0; font-size:12px; color:#AAAAAA; text-align:center">
        Du mottar dette fordi du har valgt ${esc(period)} sammendrag i Maintain.<br>
        Endre varsler under <strong>Innstillinger</strong> i appen.
      </p>
    </div>
  </div>
</body>
</html>`
}

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
