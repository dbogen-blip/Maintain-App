// delete-account Edge Function
// Permanently deletes the authenticated user's account and all their data.
// Published templates are NOT deleted — their user_id and source_asset_id
// are set to NULL by FK ON DELETE SET NULL, so they remain public.
//
// The caller must pass a valid JWT (Authorization: Bearer <token>).
// Deletion order:
//   1. User data rows (assets cascade to tasks/logs/attachments automatically)
//   2. Auth user via admin API (requires SUPABASE_SERVICE_ROLE_KEY secret)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL          = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY      = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors() })

  // Verify the caller is authenticated
  const jwt = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!jwt) return json({ error: 'Unauthorized' }, 401)

  // Regular client to identify the user
  const userClient = createClient(SUPABASE_URL, jwt, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false },
  })

  const { data: { user }, error: userErr } = await userClient.auth.getUser()
  if (userErr || !user) return json({ error: 'Unauthorized' }, 401)

  const userId = user.id

  // Admin client to perform privileged operations
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  try {
    // Delete explicit rows not covered by CASCADE from assets:
    // notification_preferences, push_subscriptions, notifications_sent.
    // Assets → tasks → logs → attachments are handled by FK cascades.
    await admin.from('push_subscriptions').delete().eq('user_id', userId)
    await admin.from('notifications_sent').delete().eq('user_id', userId)
    await admin.from('notification_preferences').delete().eq('user_id', userId)
    await admin.from('task_attachments').delete().eq('user_id', userId)
    await admin.from('maintenance_log_attachments').delete().eq('user_id', userId)
    await admin.from('maintenance_logs').delete().eq('user_id', userId)
    await admin.from('tasks').delete().eq('user_id', userId)
    await admin.from('assets').delete().eq('user_id', userId)

    // Delete the auth user last — this triggers ON DELETE SET NULL on
    // asset_templates.user_id so published templates survive.
    const { error: deleteErr } = await admin.auth.admin.deleteUser(userId)
    if (deleteErr) throw deleteErr

    return json({ ok: true })
  } catch (e: any) {
    return json({ error: e.message ?? 'Deletion failed' }, 500)
  }
})

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors() },
  })
}
