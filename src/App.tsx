import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { Analytics } from '@vercel/analytics/react'
import type { Note } from './data/tracks'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { PageShell } from './components/PageShell'
import { flattenNotes, tracks } from './data/tracks'

const DsaCourse = lazy(() =>
  import('./components/DsaCourse').then((m) => ({ default: m.DsaCourse })),
)
const Library = lazy(() =>
  import('./components/Library').then((m) => ({ default: m.Library })),
)
const NoteReader = lazy(() =>
  import('./components/NoteReader').then((m) => ({ default: m.NoteReader })),
)
const Roadmap = lazy(() =>
  import('./components/Roadmap').then((m) => ({ default: m.Roadmap })),
)
const BooksApp = lazy(() =>
  import('./components/books/BooksApp').then((m) => ({ default: m.BooksApp })),
)
const Support = lazy(() =>
  import('./components/Support').then((m) => ({ default: m.Support })),
)
import {
  getCurrentLearningStep,
  getLastCompletedNote,
  getOverallProgress,
} from './data/learningPath'
import { authClient } from './lib/auth'
import {
  fetchCompletedNoteSlugs,
  markNoteComplete,
  syncCompletedNoteSlugs,
} from './lib/noteProgress'
import {
  getBooksRoute,
  getDsaQuestIdFromPath,
  getNoteSlugFromPath,
  getPathname,
  isDsaPath,
  isLibraryPath,
  navigateTo,
  redirectLegacyHash,
} from './lib/router'
import { articleJsonLd, updateSeo } from './lib/seo'

export type Theme = 'light' | 'dark'

const themeStorageKey = 'learning-atlas-theme'
const completedNotesStorageKey = 'learning-atlas-completed-notes'

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'light'
  }

  const savedTheme = window.localStorage.getItem(themeStorageKey)

  if (savedTheme === 'light' || savedTheme === 'dark') {
    return savedTheme
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

function getInitialCompletedNotes() {
  if (typeof window === 'undefined') {
    return new Set<string>()
  }

  try {
    const savedNotes = window.localStorage.getItem(completedNotesStorageKey)

    if (!savedNotes) {
      return new Set<string>()
    }

    const parsedNotes: unknown = JSON.parse(savedNotes)

    if (!Array.isArray(parsedNotes)) {
      return new Set<string>()
    }

    return new Set(
      parsedNotes.filter((note): note is string => typeof note === 'string'),
    )
  } catch {
    return new Set<string>()
  }
}

function getInitialPathname() {
  if (typeof window === 'undefined') {
    return '/'
  }

  return redirectLegacyHash() ?? getPathname()
}

function scrollToPageTop() {
  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0
}

type NoteNavigationOptions = {
  animateCourseSwitch?: boolean
  transitionTitle?: string
}

function App() {
  const { data: session } = authClient.useSession()
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const [pathname, setPathname] = useState(getInitialPathname)
  const [completedNoteSlugs, setCompletedNoteSlugs] = useState(
    getInitialCompletedNotes,
  )
  const [transitionTitle, setTransitionTitle] = useState<string | null>(null)
  const transitionTimers = useRef<number[]>([])
  const hasLoadedRemoteProgress = useRef(false)
  const syncedProgressSignature = useRef('')
  const savedRemoteNoteSlugs = useRef(new Set<string>())

  const activeNoteSlug = getNoteSlugFromPath(pathname)
  const activeDsaQuestId = getDsaQuestIdFromPath(pathname)
  const isDsa = isDsaPath(pathname)
  const isLibrary = isLibraryPath(pathname)
  const booksRoute = getBooksRoute(pathname)
  const booksRouteKind = booksRoute?.kind
  const activeNoteMatch = tracks
    .flatMap((track) =>
      flattenNotes(track.topics).map((note) => ({
        note,
        track,
      })),
    )
    .find(({ note }) => note.slug === activeNoteSlug)
  const activeTrackIndex = activeNoteMatch
    ? tracks.findIndex((track) => track.title === activeNoteMatch.track.title)
    : -1
  const nextTrack =
    activeTrackIndex >= 0 ? tracks[activeTrackIndex + 1] : undefined
  const currentLearningStep = getCurrentLearningStep(completedNoteSlugs)
  const lastCompletedNote = getLastCompletedNote(completedNoteSlugs)
  const overallProgress = getOverallProgress(completedNoteSlugs)
  const isLanding = !isDsa && !isLibrary && !activeNoteMatch

  const navigateToNote = (
    targetNote: Note,
    options: NoteNavigationOptions = {},
  ) => {
    transitionTimers.current.forEach((timer) => window.clearTimeout(timer))

    if (targetNote.slug === activeNoteSlug) {
      setTransitionTitle(null)
      scrollToPageTop()
      return
    }

    if (!options.animateCourseSwitch) {
      setTransitionTitle(null)
      navigateTo(`/notes/${targetNote.slug}`)
      scrollToPageTop()
      return
    }

    setTransitionTitle(options.transitionTitle ?? targetNote.title)

    const routeTimer = window.setTimeout(() => {
      navigateTo(`/notes/${targetNote.slug}`)
      scrollToPageTop()
    }, 420)

    const clearTimer = window.setTimeout(() => {
      setTransitionTitle(null)
      scrollToPageTop()
    }, 980)

    transitionTimers.current = [routeTimer, clearTimer]
  }

  const completeNote = (noteSlug: string) => {
    setCompletedNoteSlugs((currentSlugs) => {
      if (currentSlugs.has(noteSlug)) {
        return currentSlugs
      }

      return new Set(currentSlugs).add(noteSlug)
    })

    if (session?.user && !savedRemoteNoteSlugs.current.has(noteSlug)) {
      savedRemoteNoteSlugs.current.add(noteSlug)
      void markNoteComplete(noteSlug).catch(() => {
        savedRemoteNoteSlugs.current.delete(noteSlug)
      })
    }
  }

  const navigateToDsaQuest = (questId: string) => {
    navigateTo(`/dsa/${questId}`)
    scrollToPageTop()
  }

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem(themeStorageKey, theme)
  }, [theme])

  useEffect(() => {
    window.localStorage.setItem(
      completedNotesStorageKey,
      JSON.stringify([...completedNoteSlugs]),
    )
  }, [completedNoteSlugs])

  useEffect(() => {
    const syncRoute = () => {
      // Catch legacy #/ links pasted/bookmarked after initial load.
      const legacy = redirectLegacyHash()
      setPathname(legacy ?? getPathname())
    }

    window.addEventListener('popstate', syncRoute)

    return () => window.removeEventListener('popstate', syncRoute)
  }, [])

  // SPA navigation for same-origin <a href="/notes/..."> clicks.
  // Keeps crawlable hrefs while avoiding full page reloads.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const anchor = (event.target as HTMLElement).closest?.('a[href]')
      if (!anchor) return
      const href = anchor.getAttribute('href')
      if (!href || !href.startsWith('/')) return
      if (anchor.getAttribute('target') === '_blank') return
      // Let in-page anchors (/#roadmap, /notes/x#heading) use native behavior.
      if (href.includes('#')) return
      event.preventDefault()
      navigateTo(href)
      scrollToPageTop()
    }

    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  // Per-route SEO: title, description, canonical, OG + page_view.
  useEffect(() => {
    if (booksRouteKind) {
      updateSeo(
        booksRouteKind === 'pricing'
          ? {
              title: 'Pricing',
              description:
                'One plan for every StudyAtlas book: all current and future books, the newsletter and new-book emails.',
              path: '/pricing',
            }
          : {
              title: 'Books',
              description:
                'StudyAtlas books for engineering interviews. Read in the browser, highlight, take notes and pick up where you left off.',
              path: pathname,
            },
      )
    } else if (activeNoteMatch) {
      updateSeo({
        title: activeNoteMatch.note.title,
        description: activeNoteMatch.note.description,
        path: `/notes/${activeNoteMatch.note.slug}`,
        type: 'article',
        jsonLd: articleJsonLd({
          title: activeNoteMatch.note.title,
          description: activeNoteMatch.note.description,
          path: `/notes/${activeNoteMatch.note.slug}`,
          track: activeNoteMatch.track.title,
        }),
      })
    } else if (isLibrary) {
      updateSeo({
        title: 'Library',
        description:
          'Browse every StudyAtlas track — OS, networks, databases, JavaScript, Node, Express, MongoDB, Docker, AWS, Git and AI.',
        path: '/library',
      })
    } else if (isDsa) {
      updateSeo({
        title: 'DSA Practice',
        description:
          'Practice data structures and algorithms by pattern — arrays, two pointers, sliding window, trees and graphs.',
        path: pathname,
      })
    } else {
      updateSeo({
        title: 'StudyAtlas - Learn Backend Engineering',
        description:
          'StudyAtlas — clear backend engineering notes built for learning by doing.',
        path: '/',
      })
    }
  }, [pathname, activeNoteMatch, isLibrary, isDsa, booksRouteKind])

  useEffect(() => {
    if (!session?.user || hasLoadedRemoteProgress.current) {
      return
    }

    hasLoadedRemoteProgress.current = true

    void fetchCompletedNoteSlugs()
      .then((remoteCompletedNoteSlugs) => {
        remoteCompletedNoteSlugs.forEach((noteSlug) => {
          savedRemoteNoteSlugs.current.add(noteSlug)
        })

        setCompletedNoteSlugs((currentSlugs) => {
          const nextSlugs = new Set(currentSlugs)
          remoteCompletedNoteSlugs.forEach((noteSlug) => nextSlugs.add(noteSlug))
          return nextSlugs
        })
      })
      .catch(() => undefined)
  }, [session?.user])

  useEffect(() => {
    if (!session?.user || completedNoteSlugs.size === 0) {
      return
    }

    const progressSignature = [...completedNoteSlugs].sort().join('|')

    if (syncedProgressSignature.current === progressSignature) {
      return
    }

    syncedProgressSignature.current = progressSignature

    void syncCompletedNoteSlugs(completedNoteSlugs).catch(() => {
      syncedProgressSignature.current = ''
    })
  }, [completedNoteSlugs, session?.user])

  useEffect(() => {
    if (activeNoteSlug) {
      scrollToPageTop()
    }
  }, [activeNoteSlug])

  useEffect(
    () => () => {
      transitionTimers.current.forEach((timer) => window.clearTimeout(timer))
    },
    [],
  )

  if (booksRoute) {
    return (
      <>
        <Suspense fallback={<div className="min-h-svh bg-[#0a0a0a]" />}>
          <BooksApp route={booksRoute} />
        </Suspense>
        <SpeedInsights />
        <Analytics />
      </>
    )
  }

  return (
    <PageShell variant={isDsa ? 'dsa' : 'default'}>
      {!isLanding && (
        <Header
          theme={theme}
          onThemeToggle={() =>
            setTheme((currentTheme) =>
              currentTheme === 'light' ? 'dark' : 'light',
            )
          }
        />
      )}
      {isDsa ? (
        <Suspense fallback={<div className="min-h-screen" />}>
          <DsaCourse
            activeQuestId={activeDsaQuestId}
            onNavigateQuest={navigateToDsaQuest}
          />
        </Suspense>
      ) : isLibrary ? (
        <main>
          <Suspense fallback={<div className="min-h-screen" />}>
            <Library completedNoteSlugs={completedNoteSlugs} />
          </Suspense>
          <Footer />
        </main>
      ) : activeNoteMatch ? (
        <Suspense fallback={<div className="min-h-screen" />}>
          <NoteReader
            note={activeNoteMatch.note}
            track={activeNoteMatch.track}
            completedNoteSlugs={completedNoteSlugs}
            nextTrack={nextTrack}
            onCompleteNote={completeNote}
            onNavigateNote={navigateToNote}
          />
        </Suspense>
      ) : (
        <>
          <div className="page-hero-bg">
            <Header
              theme={theme}
              onThemeToggle={() =>
                setTheme((currentTheme) =>
                  currentTheme === 'light' ? 'dark' : 'light',
                )
              }
            />
            <main>
              <Hero
                currentStep={currentLearningStep}
                lastCompletedNote={lastCompletedNote}
                overallProgress={overallProgress}
              />
            </main>
          </div>
          <Suspense fallback={<div className="min-h-40" />}>
            <Roadmap completedNoteSlugs={completedNoteSlugs} />
            <Support />
          </Suspense>
          <Footer />
        </>
      )}
      {transitionTitle && (
        <div className="note-route-transition" aria-live="polite">
          <div className="note-route-transition__title">{transitionTitle}</div>
        </div>
      )}
      <SpeedInsights />
      <Analytics />
    </PageShell>
  )
}

export default App
