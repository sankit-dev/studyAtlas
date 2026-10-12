import { motion } from 'framer-motion'
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from 'react'
import type { Note, Track } from '../data/tracks'
import { flattenNotes } from '../data/tracks'
import { fetchMarkdownNote } from '../data/markdownNotes'
import { getMarkdownToc, type MarkdownTocItem } from '../lib/markdownToc'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { MarkdownRenderer } from './MarkdownRenderer'
import { Wrap } from './PageShell'

type NoteReaderProps = {
  completedNoteSlugs: Set<string>
  note: Note
  nextTrack?: Track
  onNavigateNote: (
    note: Note,
    options?: {
      animateCourseSwitch?: boolean
      transitionTitle?: string
    },
  ) => void
  onCompleteNote: (noteSlug: string) => void
  track: Track
}

function normalizeTitle(value: string) {
  return value
    .toLowerCase()
    .replace(/^\s*\d+[.)]\s+/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function removeDuplicateTitle(markdown: string, title: string) {
  const lines = markdown.split('\n')
  const firstContentIndex = lines.findIndex((line) => line.trim())

  if (firstContentIndex === -1) {
    return markdown
  }

  const firstContentLine = lines[firstContentIndex].trim()

  if (!firstContentLine.startsWith('# ')) {
    return markdown
  }

  const heading = firstContentLine.slice(2).trim()

  if (normalizeTitle(heading) !== normalizeTitle(title)) {
    return markdown
  }

  return lines
    .filter((_, index) => index !== firstContentIndex)
    .join('\n')
    .trim()
}

function getNotePath(notes: Note[], targetSlug: string): Note[] {
  for (const candidate of notes) {
    if (candidate.slug === targetSlug) {
      return [candidate]
    }

    if (candidate.children) {
      const childPath = getNotePath(candidate.children, targetSlug)

      if (childPath.length) {
        return [candidate, ...childPath]
      }
    }
  }

  return []
}

function createStarterMarkdown(note: Note, track: Track, parentPath: Note[]) {
  const branchLabel = parentPath.length
    ? parentPath.map((pathNote) => pathNote.title).join(' -> ')
    : track.title

  return [
    `This is a starter note for **${note.title}**.`,
    '',
    `It belongs to **${branchLabel}** in the **${track.title}** track.`,
    '',
    '## What this topic is about',
    '',
    note.description,
    '',
    '## Why it matters',
    '',
    `You need this topic because it connects directly to ${track.shortTitle} work, interviews, and practical implementation. Do not treat it as a definition-only topic; try to connect it with code you would actually write.`,
    '',
    '## How to practice',
    '',
    '- Write one tiny example from scratch.',
    '- Change the example and predict the output before running it.',
    '- Explain the topic aloud in two minutes.',
    '- Note one common mistake or edge case.',
    '',
    '## Interview angle',
    '',
    `If asked about ${note.title}, start with the problem it solves, then give a small example, then mention one real-world use case.`,
  ].join('\n')
}

function NoteTableOfContents({
  items,
  variant,
}: {
  items: MarkdownTocItem[]
  variant: 'desktop' | 'mobile'
}) {
  if (items.length < 2) {
    return null
  }

  function scrollToHeading(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const tocList = (
    <nav aria-label="On this page">
      <ol>
        {items.map((item) => (
          <li data-level={item.level} key={item.id}>
            <button
              type="button"
              onClick={() => scrollToHeading(item.id)}
            >
              {item.title}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  )

  if (variant === 'mobile') {
    return (
      <details className="note-toc-mobile">
        <summary>On this page</summary>
        {tocList}
      </details>
    )
  }

  return (
    <aside className="note-toc-desktop" aria-label="On this page">
      <p>On this page</p>
      {tocList}
    </aside>
  )
}

export function NoteReader({
  completedNoteSlugs,
  note,
  nextTrack,
  onCompleteNote,
  onNavigateNote,
  track,
}: NoteReaderProps) {
  const reducedMotion = useReducedMotion()
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(
    () => new Set(),
  )
  const [collapsedBranches, setCollapsedBranches] = useState<Set<string>>(
    () => new Set(),
  )
  const [isFocusReading, setIsFocusReading] = useState(false)
  const readerShellRef = useRef<HTMLElement>(null)
  const [fetchedBody, setFetchedBody] = useState<string | null>(null)
  const flatNotes = flattenNotes(track.topics)
  const notePath = getNotePath(track.topics, note.slug)
  const parentPath = notePath.slice(0, -1)

  useEffect(() => {
    let cancelled = false

    void fetchMarkdownNote(note.slug).then((markdownNote) => {
      if (cancelled) return

      if (markdownNote?.body) {
        setFetchedBody(removeDuplicateTitle(markdownNote.body, note.title))
      } else {
        setFetchedBody(null)
      }
    })

    return () => {
      cancelled = true
    }
  }, [note.slug, note.title])

  const body = fetchedBody ?? createStarterMarkdown(note, track, parentPath)
  const tocItems = getMarkdownToc(body)
  const currentNoteIndex = flatNotes.findIndex(
    (trackNote) => trackNote.slug === note.slug,
  )
  const completedTrackCount = flatNotes.filter((trackNote) =>
    completedNoteSlugs.has(trackNote.slug),
  ).length
  const previousNote =
    currentNoteIndex > 0 ? flatNotes[currentNoteIndex - 1] : undefined
  const nextNote =
    currentNoteIndex < flatNotes.length - 1
      ? flatNotes[currentNoteIndex + 1]
      : undefined
  const progressPercent = Math.round(
    (completedTrackCount / flatNotes.length) * 100,
  )
  const nextCourseNote = !nextNote ? nextTrack?.topics[0] : undefined
  const nextIncompleteNote = flatNotes.find(
    (trackNote) => !completedNoteSlugs.has(trackNote.slug),
  )

  useEffect(() => {
    document.body.classList.toggle('is-focus-reading', isFocusReading)

    return () => {
      document.body.classList.remove('is-focus-reading')
    }
  }, [isFocusReading])

  useEffect(() => {
    if (!isFocusReading) {
      return
    }

    readerShellRef.current?.scrollTo({ top: 0, behavior: 'auto' })
  }, [isFocusReading, note.slug])

  useEffect(() => {
    function handleFullscreenChange() {
      if (!document.fullscreenElement) {
        setIsFocusReading(false)
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  const enterFocusReading = async () => {
    setIsMobileSidebarOpen(false)
    setIsFocusReading(true)

    try {
      await readerShellRef.current?.requestFullscreen()
    } catch {
      // Browser fullscreen can be blocked; the distraction-free layout still works.
    }
  }

  const exitFocusReading = async () => {
    setIsFocusReading(false)

    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen()
      } catch {
        // Keep the in-page focus state off even if the browser rejects exit.
      }
    }
  }

  const handleFocusToggle = () => {
    if (isFocusReading) {
      void exitFocusReading()
    } else {
      void enterFocusReading()
    }
  }

  const handleNoteClick = (
    event: MouseEvent<HTMLAnchorElement>,
    targetNote: Note,
    options?: {
      animateCourseSwitch?: boolean
      transitionTitle?: string
    },
  ) => {
    event.preventDefault()
    setIsMobileSidebarOpen(false)
    onNavigateNote(targetNote, options)
  }

  const handleUnderstandAndContinue = () => {
    onCompleteNote(note.slug)

    if (nextNote) {
      onNavigateNote(nextNote)
      return
    }

    if (nextCourseNote && nextTrack) {
      onNavigateNote(nextCourseNote, {
        animateCourseSwitch: true,
        transitionTitle: nextTrack.title,
      })
    }
  }

  const isBranchActive = (branchNote: Note): boolean =>
    branchNote.slug === note.slug ||
    Boolean(branchNote.children?.some((childNote) => isBranchActive(childNote)))

  const toggleBranch = (branchSlug: string, isOpen: boolean) => {
    setExpandedBranches((currentBranches) => {
      const nextBranches = new Set(currentBranches)

      if (isOpen) {
        nextBranches.delete(branchSlug)
      } else {
        nextBranches.add(branchSlug)
      }

      return nextBranches
    })

    setCollapsedBranches((currentBranches) => {
      const nextBranches = new Set(currentBranches)

      if (isOpen) {
        nextBranches.add(branchSlug)
      } else {
        nextBranches.delete(branchSlug)
      }

      return nextBranches
    })
  }

  const renderSidebarNote = (trackNote: Note, depth = 0) => {
    const isActive = trackNote.slug === note.slug
    const isCompleted = completedNoteSlugs.has(trackNote.slug)
    const isNextIncomplete = nextIncompleteNote?.slug === trackNote.slug
    const hasChildren = Boolean(trackNote.children?.length)
    const childNotes = trackNote.children ? flattenNotes(trackNote.children) : []
    const completedChildCount = childNotes.filter((childNote) =>
      completedNoteSlugs.has(childNote.slug),
    ).length
    const childProgressPercent = childNotes.length
      ? Math.round((completedChildCount / childNotes.length) * 100)
      : 0
    const isOpen =
      !collapsedBranches.has(trackNote.slug) &&
      (expandedBranches.has(trackNote.slug) || isBranchActive(trackNote))
    const noteIndex = flatNotes.findIndex(
      (candidate) => candidate.slug === trackNote.slug,
    )

    return (
      <li
        className={depth > 0 ? 'note-sidebar-child-item' : undefined}
        key={trackNote.slug}
      >
        <div
          className="note-sidebar-row"
          style={{ '--note-depth': depth } as CSSProperties}
        >
          <a
            className={`note-sidebar-link grid grid-cols-[24px_1fr] gap-2 border-t border-(--color-soft-line) py-3 text-[12px] leading-[1.35] transition-colors ${
              isActive
                ? 'font-extrabold text-(--color-text)'
                : 'text-(--color-muted) hover:text-(--color-accent-text)'
            }`}
            data-completed={isCompleted}
            data-next-incomplete={isNextIncomplete}
            href={`/notes/${trackNote.slug}`}
            onClick={(event) => handleNoteClick(event, trackNote)}
          >
            <span className="font-mono text-[10px]">
              {isCompleted
                ? '✓'
                : isNextIncomplete
                  ? '→'
                  : String(noteIndex + 1).padStart(2, '0')}
            </span>
            <span className="note-sidebar-link__content">
              <span className="note-sidebar-link__title">
                {trackNote.title}
                {hasChildren && (
                  <span
                    className="note-sidebar-branch-progress"
                    data-complete={completedChildCount === childNotes.length}
                  >
                    {completedChildCount}/{childNotes.length}
                  </span>
                )}
              </span>
              {hasChildren && (
                <span className="note-sidebar-branch-meter" aria-hidden="true">
                  <span style={{ width: `${childProgressPercent}%` }} />
                </span>
              )}
            </span>
          </a>

          {hasChildren && (
            <button
              aria-expanded={isOpen}
              aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${trackNote.title}`}
              className="note-sidebar-branch-toggle"
              type="button"
              onClick={() => toggleBranch(trackNote.slug, isOpen)}
            >
              {isOpen ? '−' : '+'}
            </button>
          )}
        </div>

        {hasChildren && isOpen && (
          <ol className="note-sidebar-children m-0 list-none p-0">
            {trackNote.children?.map((childNote) =>
              renderSidebarNote(childNote, depth + 1),
            )}
          </ol>
        )}
      </li>
    )
  }

  return (
    <main
      className="note-reader-shell"
      data-focus-reading={isFocusReading}
      ref={readerShellRef}
    >
      <Wrap>
        <div className="note-reader-grid grid grid-cols-[260px_minmax(0,1fr)_190px] gap-12 max-[1180px]:grid-cols-[240px_minmax(0,1fr)] max-[980px]:grid-cols-1">
          <aside className="note-reader-sidebar border-r border-(--color-line) pr-6 max-[980px]:border-r-0 max-[980px]:border-b max-[980px]:pr-0 max-[980px]:pb-6">
            <div className="note-reader-sidebar__summary">
              <div className="min-w-0">
                <p className="eyebrow m-0 text-(--color-accent-text)">
                  {track.title}
                </p>
                <p className="m-0 mt-2 font-mono text-[11px] text-(--color-muted)">
                  {completedTrackCount} / {flatNotes.length} understood
                </p>
              </div>
              <button
                aria-controls="note-reader-topic-list"
                aria-expanded={isMobileSidebarOpen}
                className="note-reader-sidebar__toggle"
                type="button"
                onClick={() => setIsMobileSidebarOpen((isOpen) => !isOpen)}
              >
                {isMobileSidebarOpen ? 'Hide topics' : 'Show topics'}
              </button>
            </div>

            <div className="mt-4 mb-5 h-2 overflow-hidden rounded-full bg-(--color-soft-line)">
              <div
                className="h-full bg-(--color-accent-strong)"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div
              className={`note-reader-sidebar__body ${
                isMobileSidebarOpen ? 'is-open' : ''
              }`}
              id="note-reader-topic-list"
            >
              <div className="note-topic-drawer__header">
                <div>
                  <p>{track.shortTitle}</p>
                  <span>
                    {completedTrackCount} / {flatNotes.length} understood
                  </span>
                </div>
                <button
                  aria-label="Close topics"
                  type="button"
                  onClick={() => setIsMobileSidebarOpen(false)}
                >
                  Close
                </button>
              </div>

              <a
                className="mb-5 inline-block text-xs font-extrabold text-(--color-muted) transition-colors hover:text-(--color-accent-text)"
                href="/library"
              >
                Back to library
              </a>

              <nav aria-label={`${track.title} notes`}>
              <ol className="m-0 list-none p-0">
                {track.topics.map((trackNote) => renderSidebarNote(trackNote))}
              </ol>
              </nav>
            </div>
            {isMobileSidebarOpen && (
              <button
                aria-label="Close topics"
                className="note-topic-drawer__backdrop"
                type="button"
                onClick={() => setIsMobileSidebarOpen(false)}
              />
            )}
          </aside>

          <motion.article
            className="note-reader-content min-w-0"
            key={note.slug}
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={reducedMotion ? undefined : { opacity: 1 }}
            transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <header className="mb-10 max-w-205">
              <nav className="note-breadcrumb" aria-label="Breadcrumb">
                <ol>
                  <li>
                    <a href="/library">Library</a>
                  </li>
                  <li>
                    <span>{track.title}</span>
                  </li>
                  {parentPath.map((pathNote) => (
                    <li key={pathNote.slug}>
                      <a
                        href={`/notes/${pathNote.slug}`}
                        onClick={(event) => handleNoteClick(event, pathNote)}
                      >
                        {pathNote.title}
                      </a>
                    </li>
                  ))}
                  <li aria-current="page">
                    <span>{note.title}</span>
                  </li>
                </ol>
              </nav>
              <h1 className="m-0 max-w-205 text-[clamp(34px,4.8vw,56px)] font-medium leading-[1.04] tracking-[-0.015em]">
                {note.title}
              </h1>
              <p className="mt-6 mb-0 text-base leading-[1.8] text-(--color-muted)">
                {note.description}
              </p>
              <button
                aria-label={
                  isFocusReading ? 'Exit focus reading' : 'Enter focus reading'
                }
                className="note-focus-reading-toggle"
                title={
                  isFocusReading ? 'Exit focus reading' : 'Enter focus reading'
                }
                type="button"
                onClick={handleFocusToggle}
              >
                {isFocusReading ? (
                  <span className="note-focus-dot" />
                ) : (
                  <svg
                    aria-hidden="true"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path d="M8 3H3v5" />
                    <path d="M16 3h5v5" />
                    <path d="M8 21H3v-5" />
                    <path d="M16 21h5v-5" />
                  </svg>
                )}
                <span>{isFocusReading ? 'Focusing' : 'Focus'}</span>
              </button>
              <div className="note-meta">
                <b>
                  {completedNoteSlugs.has(note.slug)
                    ? 'Understood'
                    : nextIncompleteNote?.slug === note.slug
                      ? 'Up next'
                      : 'In progress'}
                </b>
                <span>
                  {completedTrackCount} of {flatNotes.length} understood in{' '}
                  {track.shortTitle}
                </span>
                {note.priority && <span>{note.priority}</span>}
              </div>
            </header>

            <NoteTableOfContents items={tocItems} variant="mobile" />

            <MarkdownRenderer
              context={track.title}
              key={`${track.title}:${note.slug}`}
              markdown={body}
            />

            <div className="note-understand-panel">
              <div>
                <p className="eyebrow">Track understanding</p>
                <h2>I understand this concept.</h2>
                <span>
                  Mark it only when you can explain the idea and why it matters
                  in your own words.
                </span>
              </div>
              <button type="button" onClick={handleUnderstandAndContinue}>
                {nextNote || nextCourseNote
                  ? 'Mark understood & continue'
                  : 'Mark understood'}
              </button>
            </div>

            <nav
              aria-label="Previous and next notes"
              className="mt-14 grid grid-cols-2 gap-4 border-t border-(--color-line) pt-6 max-[640px]:grid-cols-1"
            >
              {previousNote ? (
                <a
                  className="rounded-lg border border-(--color-line) p-4 transition-colors hover:border-(--color-accent-strong)"
                  href={`/notes/${previousNote.slug}`}
                  onClick={(event) => handleNoteClick(event, previousNote)}
                >
                  <span className="eyebrow text-(--color-muted)">
                    Previous
                  </span>
                  <span className="mt-2 block text-sm font-extrabold">
                    {previousNote.title}
                  </span>
                </a>
              ) : (
                <span />
              )}

              {nextNote ? (
                <a
                  className="rounded-lg border border-(--color-line) p-4 text-right transition-colors hover:border-(--color-accent-strong) max-[640px]:text-left"
                  href={`/notes/${nextNote.slug}`}
                  onClick={(event) => handleNoteClick(event, nextNote)}
                >
                  <span className="eyebrow text-(--color-muted)">Next</span>
                  <span className="mt-2 block text-sm font-extrabold">
                    {nextNote.title}
                  </span>
                </a>
              ) : nextCourseNote && nextTrack ? (
                <a
                  className="rounded-lg border border-(--color-line) p-4 text-right transition-colors hover:border-(--color-accent-strong) max-[640px]:text-left"
                  href={`/notes/${nextCourseNote.slug}`}
                  onClick={(event) =>
                    handleNoteClick(event, nextCourseNote, {
                      animateCourseSwitch: true,
                      transitionTitle: nextTrack.title,
                    })
                  }
                >
                  <span className="eyebrow text-(--color-accent-text)">
                    Next course
                  </span>
                  <span className="mt-2 block text-sm font-extrabold">
                    {nextTrack.title}
                  </span>
                  <span className="mt-2 block text-xs leading-[1.6] text-(--color-muted)">
                    Start with {nextCourseNote.title}
                  </span>
                </a>
              ) : (
                <div className="rounded-lg border border-(--color-line) p-4 text-right max-[640px]:text-left">
                  <span className="eyebrow text-(--color-muted)">
                    Roadmap complete
                  </span>
                  <span className="mt-2 block text-sm font-extrabold">
                    You reached the final course.
                  </span>
                </div>
              )}
            </nav>
          </motion.article>

          <NoteTableOfContents items={tocItems} variant="desktop" />
        </div>
      </Wrap>
    </main>
  )
}
