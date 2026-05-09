// Storage helpers for the single 'asset-images' Supabase bucket.
// The bucket is public, so publicUrl() returns a permanent direct URL —
// no signed URLs or expiry logic needed.
// Path structure: {user_id}/{context}/{context-id}/{random}-{sanitized-filename}
// Contexts:
//   assets/{asset_id}/cover-...  — asset cover images
//   tasks/{task_id}/...          — instruction docs and images attached to a task
//   logs/{log_id}/...            — completion photos/files attached to a log entry

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

/** Upload a cover image for an asset. Returns the storage path and its public URL. */
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

/** Upload a file attachment for a task. Returns metadata for inserting into task_attachments. */
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

/** Upload a photo or file for a maintenance log entry. Returns metadata for maintenance_log_attachments. */
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

/** Delete a file from storage. The caller is responsible for removing the metadata row. */
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
