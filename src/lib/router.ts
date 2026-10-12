export function getPathname(): string {
  if (typeof window === 'undefined') return '/'
  return window.location.pathname
}

export function navigateTo(path: string) {
  if (typeof window === 'undefined') return
  if (window.location.pathname + window.location.search === path) {
    window.dispatchEvent(new PopStateEvent('popstate'))
    return
  }
  window.history.pushState(null, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

/** One-time legacy redirect: #/notes/x -> /notes/x, #/library -> /library, #/dsa... */
export function redirectLegacyHash(): string | null {
  if (typeof window === 'undefined') return null
  const hash = window.location.hash
  if (!hash.startsWith('#/')) return null
  const legacyPath = hash.slice(1) // "/notes/x"
  // Only handle known SPA routes; leave in-page anchors like #top alone
  // (those don't start with "#/").
  if (
    legacyPath === '/library' ||
    legacyPath === '/dsa' ||
    legacyPath.startsWith('/dsa/') ||
    legacyPath.startsWith('/notes/')
  ) {
    window.history.replaceState(null, '', legacyPath)
    return legacyPath
  }
  return null
}

export function getNoteSlugFromPath(pathname: string): string | null {
  if (!pathname.startsWith('/notes/')) return null
  const slug = pathname.replace('/notes/', '').split('/')[0].trim()
  try {
    return decodeURIComponent(slug) || null
  } catch {
    return slug || null
  }
}

export function getDsaQuestIdFromPath(pathname: string): string | null {
  if (!pathname.startsWith('/dsa/')) return null
  const id = pathname.replace('/dsa/', '').split('/')[0].trim()
  return id || null
}

export function isDsaPath(pathname: string) {
  return pathname === '/dsa' || pathname.startsWith('/dsa/')
}

export function isLibraryPath(pathname: string) {
  return pathname === '/library'
}

export type BooksRoute =
  | { kind: 'catalogue' }
  | { kind: 'pricing' }
  | { kind: 'book'; slug: string }
  | { kind: 'read'; slug: string; chapter: number }

/** /books, /books/:slug, /books/:slug/read/:chapter and /pricing. */
export function getBooksRoute(pathname: string): BooksRoute | null {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (path === '/pricing') return { kind: 'pricing' }
  if (path === '/books') return { kind: 'catalogue' }
  if (!path.startsWith('/books/')) return null

  const [slug, segment, chapter] = path.slice('/books/'.length).split('/')
  if (!slug) return { kind: 'catalogue' }
  if (segment === 'read') {
    const number = Number.parseInt(chapter ?? '', 10)
    return { kind: 'read', slug, chapter: Number.isFinite(number) ? number : 1 }
  }
  return { kind: 'book', slug }
}
