// Hjelpefunksjoner for upload til Supabase Storage (bucket 'asset-images').
// Filer organiseres som: {user_id}/{kontekst}/{kontekst-id}/{tilfeldig}-{filnavn}
//
// Kontekster:
//   - assets/{asset_id}/cover-... (hovedbilde)
//   - tasks/{task_id}/...          (vedlegg knyttet til en oppgave)
//   - logs/{log_id}/...            (bilder/filer på utført vedlikehold)

import { supabase } from './supabaseClient'

const BUCKET = 'asset-images'

function safeName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function rand() {
  return Math.random().toString(36).slice(2, 10)
}

async function getUserId() {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw new Error('Du må være innlogget for å laste opp filer')
  return data.user.id
}

export function publicUrl(path) {
  if (!path) return null
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data?.publicUrl ?? null
}

/** Last opp ett asset-coverbilde. Returnerer storage-path (lagre på assets.image_url som public URL). */
export async function uploadAssetCover(assetId, file) {
  const userId = await getUserId()
  const path = `${userId}/assets/${assetId}/cover-${rand()}-${safeName(file.name)}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type,
  })
  if (error) throw error
  return { path, url: publicUrl(path) }
}

/** Last opp et vedlegg til en task. Returnerer informasjon for å sette inn i task_attachments. */
export async function uploadTaskAttachment(taskId, file) {
  const userId = await getUserId()
  const path = `${userId}/tasks/${taskId}/${rand()}-${safeName(file.name)}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type,
  })
  if (error) throw error
  return {
    file_path: path,
    file_name: file.name,
    mime_type: file.type || 'application/octet-stream',
    size_bytes: file.size,
    url: publicUrl(path),
  }
}

/** Last opp et bilde/fil til en maintenance_log. */
export async function uploadLogAttachment(logId, file) {
  const userId = await getUserId()
  const path = `${userId}/logs/${logId}/${rand()}-${safeName(file.name)}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type,
  })
  if (error) throw error
  return {
    file_path: path,
    file_name: file.name,
    mime_type: file.type || 'application/octet-stream',
    size_bytes: file.size,
    url: publicUrl(path),
  }
}

/** Slett en fil fra storage og fra metadata-tabellen (caller velger). */
export async function deleteFile(path) {
  if (!path) return
  await supabase.storage.from(BUCKET).remove([path])
}

export function isImage(mime) {
  return typeof mime === 'string' && mime.startsWith('image/')
}

export function humanSize(bytes) {
  if (bytes == null) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
