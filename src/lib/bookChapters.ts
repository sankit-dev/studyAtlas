import type { ChapterDoc } from '../components/books/chapter/types'

const apiOrigin = import.meta.env.VITE_API_ORIGIN ?? 'http://localhost:4000'

export type ChapterResult =
  | { status: 'ok'; doc: ChapterDoc }
  | { status: 'locked'; reason: 'signin' | 'subscribe' }
  | { status: 'missing' }
  | { status: 'error' }

/** Chapters are never bundled: the API sends them to readers allowed to open them. */
export async function fetchChapter(slug: string, number: number, signal?: AbortSignal): Promise<ChapterResult> {
  try {
    const response = await fetch(
      `${apiOrigin}/api/books/${encodeURIComponent(slug)}/chapters/${number}`,
      { credentials: 'include', signal },
    )
    if (response.status === 401) return { status: 'locked', reason: 'signin' }
    if (response.status === 403) return { status: 'locked', reason: 'subscribe' }
    if (response.status === 404) return { status: 'missing' }
    if (!response.ok) return { status: 'error' }
    const data = (await response.json()) as { chapter?: ChapterDoc }
    if (!data.chapter || !Array.isArray(data.chapter.blocks)) return { status: 'error' }
    return { status: 'ok', doc: data.chapter }
  } catch (error) {
    if (signal?.aborted) throw error
    return { status: 'error' }
  }
}
