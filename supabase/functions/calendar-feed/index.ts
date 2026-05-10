// ICS calendar feed for a user's upcoming maintenance tasks.
// URL: /functions/v1/calendar-feed?token=<calendar_token>
// No auth header needed — the token acts as the secret (share-safe URL).
//
// Returns a valid VCALENDAR document with one VEVENT per task whose
// effective due date (fixed_due_date ?? next_due) is not null.
// km-based tasks are included if next_due_km is set but shown with a
// generic description since they don't have a calendar date.
//
// Clients poll this URL on their own schedule; iCal/Google Calendar
// typically refresh every 24 h.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL            = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

function icsDate(dateStr: string): string {
  // dateStr is YYYY-MM-DD — emit as DATE value (all-day event)
  return dateStr.replace(/-/g, '')
}

function icsEscape(s: string): string {
  return (s ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

function fold(line: string): string {
  // RFC 5545 §3.1: fold lines at 75 octets
  const bytes = new TextEncoder().encode(line)
  if (bytes.length <= 75) return line
  const parts: string[] = []
  let start = 0
  while (start < bytes.length) {
    const chunk = bytes.slice(start, start + (start === 0 ? 75 : 74))
    parts.push(new TextDecoder().decode(chunk))
    start += start === 0 ? 75 : 74
  }
  return parts.join('\r\n ')
}

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const token = url.searchParams.get('token')

  if (!token) {
    return new Response('Missing token', { status: 400 })
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)

  // Look up the user by token
  const { data: row } = await admin
    .from('calendar_tokens')
    .select('user_id')
    .eq('token', token)
    .maybeSingle()

  if (!row) {
    return new Response('Invalid token', { status: 403 })
  }

  const userId = row.user_id

  // Fetch all active assets for this user
  const { data: assets } = await admin
    .from('assets')
    .select('id, name')
    .eq('user_id', userId)
    .is('deleted_at', null)

  if (!assets?.length) {
    return new Response(buildCalendar([]), {
      headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
    })
  }

  const assetIds = assets.map((a: { id: string }) => a.id)
  const assetMap = new Map(assets.map((a: { id: string; name: string }) => [a.id, a.name]))

  // Fetch all non-deleted tasks for those assets
  const { data: tasks } = await admin
    .from('tasks')
    .select('id, asset_id, title, description, next_due, fixed_due_date, interval_type, next_due_km, priority')
    .in('asset_id', assetIds)
    .is('deleted_at', null)

  const events: string[] = []

  for (const t of tasks ?? []) {
    const effectiveDue: string | null = t.fixed_due_date ?? t.next_due
    if (!effectiveDue) continue  // km-only tasks without a date: skip

    const assetName = assetMap.get(t.asset_id) ?? 'Ukjent eiendel'
    const summary   = icsEscape(`${t.title} — ${assetName}`)
    const desc      = t.description ? icsEscape(t.description.slice(0, 500)) : ''
    const dtstart   = icsDate(effectiveDue)
    // UID: stable across refreshes so calendar apps don't duplicate events
    const uid       = `maintain-task-${t.id}@maintain-app`
    const priority  = t.priority === 1 ? '1' : t.priority === 3 ? '9' : '5'

    const lines = [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTART;VALUE=DATE:${dtstart}`,
      `SUMMARY:${fold(summary)}`,
      desc ? `DESCRIPTION:${fold(desc)}` : '',
      `PRIORITY:${priority}`,
      `STATUS:NEEDS-ACTION`,
      'END:VEVENT',
    ].filter(Boolean)

    events.push(lines.join('\r\n'))
  }

  return new Response(buildCalendar(events), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="maintain.ics"',
      'Cache-Control': 'max-age=3600',
    },
  })
})

function buildCalendar(events: string[]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Maintain App//NO',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Vedlikeholdskalender',
    'X-WR-CALDESC:Oppgaver fra Maintain',
    ...events,
    'END:VCALENDAR',
  ]
  return lines.join('\r\n')
}
