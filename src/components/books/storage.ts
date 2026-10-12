// Per-reader conveniences kept in this browser. Progress and highlights move to
// the API once accounts and subscriptions are wired up; until then they live
// here so the reader works end to end.

export type ReaderTheme = 'dark' | 'sepia' | 'night' | 'paper'
export type ReaderFont = 'serif' | 'sans'
export type ReaderWidth = 'narrow' | 'medium' | 'wide'

export type ReaderPrefs = {
  theme: ReaderTheme
  size: number
  font: ReaderFont
  width: ReaderWidth
}

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink'

export type Highlight = {
  id: string
  block: number
  start: number
  end: number
  color: HighlightColor
  text: string
  note: string
  createdAt: number
}

export type BookProgress = {
  slug: string
  chapter: number
  /** 0–1 through the current chapter. */
  position: number
  updatedAt: number
}

export const defaultPrefs: ReaderPrefs = {
  theme: 'dark',
  size: 19,
  font: 'serif',
  width: 'medium',
}

export const minTextSize = 15
export const maxTextSize = 25

const prefsKey = 'books:reader-prefs'
const progressKey = 'books:progress'
const highlightsKey = (slug: string, chapter: number) =>
  `books:highlights:${slug}:${chapter}`

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage can be full or blocked; the reader keeps working in memory.
  }
}

const themes: ReaderTheme[] = ['dark', 'sepia', 'night', 'paper']
const fonts: ReaderFont[] = ['serif', 'sans']
const widths: ReaderWidth[] = ['narrow', 'medium', 'wide']

export function loadPrefs(): ReaderPrefs {
  const saved = readJson<Partial<ReaderPrefs>>(prefsKey) ?? {}
  const size = Number(saved.size)
  return {
    theme: themes.includes(saved.theme as ReaderTheme)
      ? (saved.theme as ReaderTheme)
      : defaultPrefs.theme,
    font: fonts.includes(saved.font as ReaderFont)
      ? (saved.font as ReaderFont)
      : defaultPrefs.font,
    width: widths.includes(saved.width as ReaderWidth)
      ? (saved.width as ReaderWidth)
      : defaultPrefs.width,
    size:
      Number.isFinite(size) && size >= minTextSize && size <= maxTextSize
        ? size
        : defaultPrefs.size,
  }
}

export function savePrefs(prefs: ReaderPrefs) {
  writeJson(prefsKey, prefs)
}

export function loadAllProgress(): Record<string, BookProgress> {
  const saved = readJson<Record<string, BookProgress>>(progressKey)
  return saved && typeof saved === 'object' ? saved : {}
}

export function loadProgress(slug: string): BookProgress | null {
  return loadAllProgress()[slug] ?? null
}

export function saveProgress(progress: BookProgress) {
  writeJson(progressKey, { ...loadAllProgress(), [progress.slug]: progress })
}

export function loadHighlights(slug: string, chapter: number): Highlight[] {
  const saved = readJson<Highlight[]>(highlightsKey(slug, chapter))
  return Array.isArray(saved) ? saved : []
}

export function saveHighlights(
  slug: string,
  chapter: number,
  highlights: Highlight[],
) {
  writeJson(highlightsKey(slug, chapter), highlights)
}
