import { apiFetch, jsonRequest, readJson } from './api'

export type DsaProgressOutcome = 'solved' | 'guided' | 'review'

export type DsaProgressRecord = {
  questId: string
  outcome: DsaProgressOutcome
  reviewStep: number
  reviewDueAt: string | null
  updatedAt: string
}

type DsaProgressResponse = {
  progress?: unknown
}

function parseProgressRecords(data: DsaProgressResponse): DsaProgressRecord[] {
  if (!Array.isArray(data.progress)) {
    return []
  }

  return data.progress.filter(
    (item): item is DsaProgressRecord =>
      item !== null &&
      typeof item === 'object' &&
      typeof (item as Record<string, unknown>).questId === 'string' &&
      typeof (item as Record<string, unknown>).outcome === 'string' &&
      typeof (item as Record<string, unknown>).reviewStep === 'number',
  )
}

export async function fetchDsaProgress(): Promise<DsaProgressRecord[]> {
  const response = await apiFetch('/api/dsa/progress')

  if (!response.ok) {
    throw new Error('Unable to fetch DSA progress')
  }

  return parseProgressRecords(await readJson<DsaProgressResponse>(response))
}

export async function syncDsaProgress(
  progressMap: Record<
    string,
    { outcome: DsaProgressOutcome; reviewStep: number; reviewDueAt?: string }
  >,
): Promise<DsaProgressRecord[]> {
  const progress = Object.entries(progressMap).map(([questId, data]) => ({
    questId,
    ...data,
  }))

  const response = await apiFetch(
    '/api/dsa/progress/sync',
    jsonRequest({ progress }, { method: 'POST' }),
  )

  if (!response.ok) {
    throw new Error('Unable to sync DSA progress')
  }

  return parseProgressRecords(await readJson<DsaProgressResponse>(response))
}

export async function markDsaQuestOutcome(
  questId: string,
  outcome: DsaProgressOutcome,
): Promise<DsaProgressRecord> {
  const response = await apiFetch(
    `/api/dsa/progress/${encodeURIComponent(questId)}`,
    jsonRequest({ outcome }, { method: 'PUT' }),
  )

  if (!response.ok) {
    throw new Error('Unable to save DSA quest outcome')
  }

  return readJson<DsaProgressRecord>(response)
}

export async function markDsaReviewComplete(
  questId: string,
): Promise<DsaProgressRecord> {
  const response = await apiFetch(
    `/api/dsa/progress/${encodeURIComponent(questId)}/review`,
    { method: 'PUT' },
  )

  if (!response.ok) {
    throw new Error('Unable to advance DSA review step')
  }

  return readJson<DsaProgressRecord>(response)
}
