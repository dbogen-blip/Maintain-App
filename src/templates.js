// Hjelpefunksjoner for templates (offentlige vedlikeholdsprogram).
//
// publishAsset(assetId)        → tar et snapshot av brukerens asset+tasks+attachments
//                                som offentlig mal. SQL-funksjon på server gjør jobben.
//
// forkTemplate(templateId)     → kopierer en mal inn i den innloggede brukerens
//                                konto. Filer kopieres i Storage (Supabase
//                                .copy()), så forken er uavhengig av original.

import { supabase } from './supabaseClient'

const BUCKET = 'asset-images'

export async function publishAsset(assetId) {
  const { data, error } = await supabase.rpc('publish_asset_as_template', {
    p_asset_id: assetId,
  })
  if (error) throw error
  return data // template id
}

export async function unpublishAsset(assetId) {
  // Slett alle templates der source_asset_id = assetId
  const { error } = await supabase
    .from('asset_templates')
    .delete()
    .eq('source_asset_id', assetId)
  if (error) throw error
}

export async function getTemplateForAsset(assetId) {
  const { data } = await supabase
    .from('asset_templates')
    .select('id, created_at, updated_at, views_count, forks_count')
    .eq('source_asset_id', assetId)
    .maybeSingle()
  return data
}

/**
 * Fork en mal til innlogget bruker.
 * Returnerer ID-en til den nye asset-en i brukerens konto.
 */
export async function forkTemplate(templateId) {
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData?.user?.id
  if (!userId) throw new Error('Du må være innlogget for å lagre en mal')

  // 1. Hent template + tasks + attachments
  const { data: template, error: tErr } = await supabase
    .from('asset_templates')
    .select(`
      id, name, category, description, image_url,
      task_templates(id, title, interval_days, priority, description, display_order,
                     attachments:task_template_attachments(id, file_path, file_name, mime_type, size_bytes))
    `)
    .eq('id', templateId)
    .single()
  if (tErr) throw tErr

  // 2. Lag asset hos brukeren
  const { data: newAsset, error: aErr } = await supabase
    .from('assets')
    .insert({
      name: template.name,
      category: template.category,
      description: template.description,
      // image_url kopieres som referanse til samme fil — original ligger i publishers folder
      image_url: template.image_url,
    })
    .select()
    .single()
  if (aErr) throw aErr

  // 3. For hver oppgave, lag task + kopier vedlegg
  for (const tt of template.task_templates ?? []) {
    const { data: newTask, error: tkErr } = await supabase
      .from('tasks')
      .insert({
        asset_id: newAsset.id,
        title: tt.title,
        interval_days: tt.interval_days,
        priority: tt.priority,
        description: tt.description,
      })
      .select()
      .single()
    if (tkErr) throw tkErr

    for (const att of tt.attachments ?? []) {
      // Kopier filen fra publishers path til vår path
      const fileName = att.file_path.split('/').pop()
      const newPath = `${userId}/tasks/${newTask.id}/${fileName}`

      const { error: copyErr } = await supabase.storage
        .from(BUCKET)
        .copy(att.file_path, newPath)
      if (copyErr) {
        // Hvis kopi feiler (fil mangler etc.), fortsett uten vedlegget
        console.warn('Kunne ikke kopiere vedlegg:', att.file_path, copyErr.message)
        continue
      }

      const { error: insErr } = await supabase
        .from('task_attachments')
        .insert({
          task_id: newTask.id,
          file_path: newPath,
          file_name: att.file_name,
          mime_type: att.mime_type,
          size_bytes: att.size_bytes,
        })
      if (insErr) console.warn('Vedleggrad-feil:', insErr.message)
    }
  }

  // 4. Bump fork-teller (best-effort)
  await supabase.rpc('bump_template_forks', { p_template_id: templateId })

  return newAsset.id
}

export async function searchTemplates({ q = '', category = '', limit = 30 } = {}) {
  let query = supabase
    .from('asset_templates')
    .select('id, name, category, description, image_url, forks_count, views_count, created_at')
    .order('forks_count', { ascending: false })
    .limit(limit)

  if (q.trim()) {
    // Bruk plainto_tsquery via textSearch
    query = query.textSearch('search_tsv', q.trim(), { config: 'simple', type: 'websearch' })
  }
  if (category) {
    query = query.eq('category', category)
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function getTemplate(templateId) {
  const { data, error } = await supabase
    .from('asset_templates')
    .select(`
      id, name, category, description, image_url, views_count, forks_count, created_at,
      tasks:task_templates (
        id, title, interval_days, priority, description, display_order,
        attachments:task_template_attachments(id, file_path, file_name, mime_type, size_bytes)
      )
    `)
    .eq('id', templateId)
    .single()
  if (error) throw error
  return data
}

export async function bumpTemplateView(templateId) {
  // Best-effort, ikke vis feil
  try {
    await supabase.rpc('bump_template_views', { p_template_id: templateId })
  } catch (e) {
    console.warn('bump view failed', e)
  }
}
