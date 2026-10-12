import { apiFetch, jsonRequest, readJson } from './api'

type NoteProgressSyncResponse = {
  completedNoteSlugs?: unknown
}

function getCompletedNoteSlugs(data: NoteProgressSyncResponse) {
  return Array.isArray(data.completedNoteSlugs)
    ? data.completedNoteSlugs.filter(
        (noteSlug): noteSlug is string => typeof noteSlug === 'string',
      )
    : []
}

export async function fetchCompletedNoteSlugs() {
  const response = await apiFetch('/api/notes/progress')

  if (!response.ok) {
    throw new Error('Unable to fetch note progress')
  }

  return getCompletedNoteSlugs(await readJson<NoteProgressSyncResponse>(response))
}

export async function syncCompletedNoteSlugs(completedNoteSlugs: Iterable<string>) {
  const response = await apiFetch(
    '/api/notes/progress/sync',
    jsonRequest({
      completedNoteSlugs: [...completedNoteSlugs],
    }, { method: 'POST' }),
  )

  if (!response.ok) {
    throw new Error('Unable to sync note progress')
  }

  return getCompletedNoteSlugs(await readJson<NoteProgressSyncResponse>(response))
}

export async function markNoteComplete(noteSlug: string) {
  const response = await apiFetch(
    `/api/notes/progress/${encodeURIComponent(noteSlug)}`,
    { method: 'PUT' },
  )

  if (!response.ok) {
    throw new Error('Unable to save note progress')
  }
}
