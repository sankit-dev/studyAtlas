import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import {
  bookPath,
  chapterPath,
  getChapter,
  getChapterCount,
  type Book,
} from '../../data/books'
import { fetchChapter, type ChapterResult } from '../../lib/bookChapters'
import { navigateTo } from '../../lib/router'
import { signInWithGithub, useBookAccess } from './access'
import { ChapterBody } from './chapter/ChapterBody'
import { countChapterWords } from './chapter/words'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  HighlighterIcon,
  ListIcon,
} from './icons'
import { ContentsDrawer, HighlightsDrawer, SettingsPanel } from './ReaderPanels'
import { useRevealOnScroll, useSmoothScroll } from './useReaderScroll'
import {
  loadHighlights,
  loadPrefs,
  loadProgress,
  saveHighlights,
  savePrefs,
  saveProgress,
  type Highlight,
  type HighlightColor,
  type ReaderPrefs,
} from './storage'

const wordsPerMinute = 230
const highlightColors: HighlightColor[] = ['yellow', 'green', 'blue', 'pink']
const widthPx = { narrow: 600, medium: 700, wide: 820 } as const

type Panel = 'contents' | 'highlights' | 'settings' | null

type Popover =
  | { kind: 'selection'; block: number; start: number; end: number; text: string; rect: DOMRect }
  | { kind: 'mark'; id: string; rect: DOMRect }

function createHighlight(fields: Omit<Highlight, 'id' | 'note' | 'createdAt'>): Highlight {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return { ...fields, id, note: '', createdAt: Date.now() }
}

function scrollRatio() {
  const max = document.documentElement.scrollHeight - window.innerHeight
  return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 1
}

/** Reads the current selection as offsets inside one text block. */
function readSelection(root: HTMLElement): Omit<Extract<Popover, { kind: 'selection' }>, 'kind'> | null {
  const selection = window.getSelection()
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null
  const range = selection.getRangeAt(0)
  if (!root.contains(range.commonAncestorContainer)) return null

  const elementOf = (node: Node) =>
    (node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement)?.closest<HTMLElement>(
      '[data-block]',
    )
  const startBlock = elementOf(range.startContainer)
  const endBlock = elementOf(range.endContainer)
  if (!startBlock || startBlock !== endBlock) return null

  const before = document.createRange()
  before.selectNodeContents(startBlock)
  before.setEnd(range.startContainer, range.startOffset)

  const raw = range.toString()
  const leading = raw.length - raw.trimStart().length
  const text = raw.trim()
  if (!text) return null

  const start = before.toString().length + leading
  return {
    block: Number(startBlock.dataset.block),
    start,
    end: start + text.length,
    text,
    rect: range.getBoundingClientRect(),
  }
}

type BookReaderProps = {
  book: Book
  chapterNumber: number
}

export function BookReader({ book, chapterNumber }: BookReaderProps) {
  const chapter = getChapter(book, chapterNumber)
  const total = getChapterCount(book)
  const { isSignedIn, isSubscribed } = useBookAccess()
  const metaLocked = Boolean(chapter && !chapter.free && !isSubscribed)
  const chapterKey = `${book.slug}:${chapterNumber}`
  const [loaded, setLoaded] = useState<{ key: string; result: ChapterResult } | null>(null)
  const [attempt, setAttempt] = useState(0)
  const result = loaded?.key === chapterKey ? loaded.result : null
  const locked = metaLocked || result?.status === 'locked'
  const doc = result?.status === 'ok' ? result.doc : null

  const [prefs, setPrefs] = useState<ReaderPrefs>(loadPrefs)
  const [panel, setPanel] = useState<Panel>(null)
  const [popover, setPopover] = useState<Popover | null>(null)
  const [highlights, setHighlights] = useState<Highlight[]>(() =>
    loadHighlights(book.slug, chapterNumber),
  )
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [position, setPosition] = useState(0)
  const articleRef = useRef<HTMLElement>(null)
  const settingsRef = useRef<HTMLDivElement>(null)
  const lenisRef = useSmoothScroll(panel === 'contents' || panel === 'highlights')

  const words = useMemo(() => (doc ? countChapterWords(doc) : 0), [doc])
  const minutesLeft = Math.max(1, Math.ceil((words * (1 - position)) / wordsPerMinute))
  const bookPercent = Math.round(((chapterNumber - 1 + position) / total) * 100)

  const hasPrev = chapterNumber > 1
  const hasNext = chapterNumber < total
  const prevChapter = hasPrev ? getChapter(book, chapterNumber - 1) : undefined
  const nextChapter = hasNext ? getChapter(book, chapterNumber + 1) : undefined

  const updatePrefs = (next: ReaderPrefs) => {
    setPrefs(next)
    savePrefs(next)
  }

  const updateHighlights = useCallback(
    (update: (current: Highlight[]) => Highlight[]) => {
      setHighlights((current) => {
        const next = update(current)
        saveHighlights(book.slug, chapterNumber, next)
        return next
      })
    },
    [book.slug, chapterNumber],
  )

  // Fetch the chapter from the API; paid chapters only reach entitled readers.
  useEffect(() => {
    if (!chapter || metaLocked) return
    const controller = new AbortController()
    fetchChapter(book.slug, chapterNumber, controller.signal)
      .then((next) => setLoaded({ key: chapterKey, result: next }))
      .catch(() => undefined)
    return () => controller.abort()
  }, [book.slug, chapter, chapterKey, chapterNumber, metaLocked, attempt])

  // Restore where the reader left this chapter, then track scroll position.
  useEffect(() => {
    if (!doc) return
    const saved = loadProgress(book.slug)
    if (saved?.chapter === chapterNumber && saved.position > 0.02) {
      requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight
        const top = saved.position * max
        if (lenisRef.current) lenisRef.current.scrollTo(top, { immediate: true })
        else window.scrollTo({ top, behavior: 'instant' })
      })
    } else {
      saveProgress({ slug: book.slug, chapter: chapterNumber, position: 0, updatedAt: Date.now() })
    }

    let saveTimer = 0
    const onScroll = () => {
      const ratio = scrollRatio()
      setPosition(ratio)
      setPopover((current) => (current ? null : current))
      window.clearTimeout(saveTimer)
      saveTimer = window.setTimeout(() => {
        saveProgress({ slug: book.slug, chapter: chapterNumber, position: ratio, updatedAt: Date.now() })
      }, 400)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.clearTimeout(saveTimer)
      window.removeEventListener('scroll', onScroll)
    }
  }, [book.slug, chapterNumber, doc, lenisRef])

  useRevealOnScroll(articleRef, Boolean(doc))

  // Keyboard: Esc closes, arrows move between chapters.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (target.closest('input, textarea, select, [contenteditable="true"]')) return
      if (event.key === 'Escape') {
        setPanel(null)
        setPopover(null)
        return
      }
      if (event.metaKey || event.ctrlKey || event.altKey || panel) return
      if (event.key === 'ArrowLeft' && hasPrev) navigateTo(chapterPath(book, chapterNumber - 1))
      if (event.key === 'ArrowRight' && hasNext) navigateTo(chapterPath(book, chapterNumber + 1))
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [book, chapterNumber, hasNext, hasPrev, panel])

  // Close the settings popover on outside click.
  useEffect(() => {
    if (panel !== 'settings') return
    const onDown = (event: MouseEvent) => {
      if (!settingsRef.current?.contains(event.target as Node)) setPanel(null)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [panel])

  const onSelectionEnd = () => {
    // Let the browser finish updating the selection first.
    requestAnimationFrame(() => {
      if (!articleRef.current) return
      const selection = readSelection(articleRef.current)
      setPopover((current) => {
        if (selection) return { kind: 'selection', ...selection }
        // Clicking a mark opens its own popover; keep that one.
        return current?.kind === 'mark' ? current : null
      })
    })
  }

  const addHighlight = (color: HighlightColor, withNote = false) => {
    if (popover?.kind !== 'selection') return
    const { block, start, end, text } = popover
    const highlight = createHighlight({ block, start, end, color, text })
    // A new highlight replaces any it overlaps.
    updateHighlights((current) => [
      ...current.filter((item) => item.block !== block || item.end <= start || item.start >= end),
      highlight,
    ])
    window.getSelection()?.removeAllRanges()
    setPopover(null)
    if (withNote) setEditingNoteId(highlight.id)
  }

  const recolor = (id: string, color: HighlightColor) => {
    updateHighlights((current) => current.map((item) => (item.id === id ? { ...item, color } : item)))
    setPopover(null)
  }

  const removeHighlight = (id: string) => {
    updateHighlights((current) => current.filter((item) => item.id !== id))
    setPopover(null)
    if (editingNoteId === id) setEditingNoteId(null)
  }

  const copyText = (text: string) => {
    void navigator.clipboard?.writeText(text).catch(() => undefined)
    window.getSelection()?.removeAllRanges()
    setPopover(null)
  }

  const jumpToHighlight = (id: string) => {
    setPanel(null)
    requestAnimationFrame(() => {
      const mark = document.querySelector<HTMLElement>(`[data-hl="${CSS.escape(id)}"]`)
      if (!mark) return
      const offset = -window.innerHeight / 3
      if (lenisRef.current) lenisRef.current.scrollTo(mark, { offset, duration: 0.9 })
      else mark.scrollIntoView({ block: 'center', behavior: 'smooth' })
    })
  }

  const activeMark =
    popover?.kind === 'mark' ? highlights.find((item) => item.id === popover.id) : undefined

  if (!chapter) {
    return (
      <div className="bk-reader" data-theme={prefs.theme}>
        <main className="bk-reader__missing">
          <h1>Chapter not found</h1>
          <a className="bk-rbtn bk-rbtn--solid" href={bookPath(book)}>
            Back to {book.title}
          </a>
        </main>
      </div>
    )
  }

  const popoverStyle = popover
    ? {
        left: Math.min(
          Math.max(popover.rect.left + popover.rect.width / 2, 150),
          window.innerWidth - 150,
        ),
        top: popover.rect.top > 72 ? popover.rect.top - 10 : popover.rect.bottom + 10,
      }
    : undefined
  const popoverBelow = popover ? popover.rect.top <= 72 : false

  return (
    <div
      className="bk-reader"
      data-font={prefs.font}
      data-theme={prefs.theme}
      style={
        {
          '--reader-size': `${prefs.size}px`,
          '--reader-width': `${widthPx[prefs.width]}px`,
        } as CSSProperties
      }
    >
      <header className="bk-reader__bar">
        <a aria-label={`Back to ${book.title}`} className="bk-icon-btn" href={bookPath(book)}>
          <ChevronLeftIcon />
        </a>
        <div className="bk-reader__title">
          <span className="bk-reader__book">{book.title}</span>
          <span className="bk-reader__chapter">
            Chapter {chapter.number} · {chapter.title}
          </span>
        </div>
        <div className="bk-reader__tools">
          <button
            aria-expanded={panel === 'contents'}
            aria-label="Contents"
            className="bk-icon-btn"
            onClick={() => setPanel(panel === 'contents' ? null : 'contents')}
            type="button"
          >
            <ListIcon />
          </button>
          {!locked && (
            <button
              aria-expanded={panel === 'highlights'}
              aria-label="Highlights"
              className="bk-icon-btn"
              onClick={() => setPanel(panel === 'highlights' ? null : 'highlights')}
              type="button"
            >
              <HighlighterIcon />
              {highlights.length > 0 && (
                <span className="bk-icon-btn__count bk-num">{highlights.length}</span>
              )}
            </button>
          )}
          <div className="bk-settings-anchor" ref={settingsRef}>
            <button
              aria-expanded={panel === 'settings'}
              aria-label="Reading settings"
              className="bk-icon-btn bk-icon-btn--text"
              onClick={() => setPanel(panel === 'settings' ? null : 'settings')}
              type="button"
            >
              Aa
            </button>
            {panel === 'settings' && <SettingsPanel onChange={updatePrefs} prefs={prefs} />}
          </div>
        </div>
        {!locked && (
          <div aria-hidden="true" className="bk-reader__progress">
            <div style={{ width: `${position * 100}%` }} />
          </div>
        )}
      </header>

      {locked ? (
        <main className="bk-reader__main">
          <article className="bk-article">
            <span className="bk-article__eyebrow">Chapter {chapter.number}</span>
            <h1>{chapter.title}</h1>
            <div aria-hidden="true" className="bk-locked-lines">
              <span />
              <span />
              <span />
              <span />
            </div>
          </article>
          <section aria-label="Unlock this book" className="bk-paywall">
            <h2>Keep reading</h2>
            <p>
              {result?.status === 'locked' && result.reason === 'signin'
                ? 'Sign in and subscribe to read every book.'
                : 'Subscribe to read every book.'}
            </p>
            <a className="bk-rbtn bk-rbtn--solid bk-rbtn--lg" href="/pricing">
              Subscribe
            </a>
            {!isSignedIn && (
              <span className="bk-paywall__signin">
                Already subscribed?{' '}
                <button onClick={signInWithGithub} type="button">
                  Sign in
                </button>
              </span>
            )}
          </section>
        </main>
      ) : (
        <main className="bk-reader__main">
          <article
            className="bk-article"
            onKeyUp={onSelectionEnd}
            onPointerDown={(event) => {
              if (!(event.target as HTMLElement).closest('mark')) setPopover(null)
            }}
            onPointerUp={onSelectionEnd}
            ref={articleRef}
          >
            {doc ? (
              <ChapterBody
                doc={doc}
                editingNoteId={editingNoteId}
                highlights={highlights}
                key={chapterKey}
                onCancelNote={() => setEditingNoteId(null)}
                onMarkClick={(id, rect) => {
                  if (window.getSelection()?.isCollapsed === false) return
                  setPopover({ kind: 'mark', id, rect })
                }}
                onSaveNote={(id, note) => {
                  updateHighlights((current) =>
                    current.map((item) => (item.id === id ? { ...item, note } : item)),
                  )
                  setEditingNoteId(null)
                }}
              />
            ) : (
              <>
                <span className="bk-article__eyebrow">Chapter {chapter.number}</span>
                <h1>{chapter.title}</h1>
                {!result && (
                  <div aria-label="Loading chapter" className="bk-locked-lines bk-loading-lines" role="status">
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                )}
                {result?.status === 'missing' && (
                  <p className="bk-reader__note">This chapter isn&rsquo;t published yet. Check back soon.</p>
                )}
                {result?.status === 'error' && (
                  <div className="bk-reader__note">
                    <p>The chapter didn&rsquo;t load. Check your connection and try again.</p>
                    <button className="bk-rbtn" onClick={() => setAttempt((n) => n + 1)} type="button">
                      Try again
                    </button>
                  </div>
                )}
              </>
            )}
          </article>
        </main>
      )}

      <nav aria-label="Chapters" className="bk-pager">
        {prevChapter ? (
          <a className="bk-pager__link" href={chapterPath(book, prevChapter.number)}>
            <span className="bk-pager__dir">Previous</span>
            <span className="bk-pager__name">
              {prevChapter.number} · {prevChapter.title}
            </span>
          </a>
        ) : (
          <span />
        )}
        {nextChapter && (
          <a className="bk-pager__link bk-pager__link--next" href={chapterPath(book, nextChapter.number)}>
            <span className="bk-pager__dir">Next</span>
            <span className="bk-pager__name">
              {nextChapter.number} · {nextChapter.title}
            </span>
          </a>
        )}
      </nav>

      {!locked && (
        <footer className="bk-status">
          <a
            aria-label="Previous chapter"
            className="bk-icon-btn bk-status__nav"
            data-disabled={!hasPrev}
            href={hasPrev ? chapterPath(book, chapterNumber - 1) : undefined}
          >
            <ChevronLeftIcon size={18} />
          </a>
          <span className="bk-num">
            {position >= 0.99
              ? 'End of chapter'
              : `${Math.round(position * 100)}% of chapter · ${minutesLeft} min left`}
          </span>
          <span className="bk-num bk-status__book">Book {bookPercent}%</span>
          <a
            aria-label="Next chapter"
            className="bk-icon-btn bk-status__nav"
            data-disabled={!hasNext}
            href={hasNext ? chapterPath(book, chapterNumber + 1) : undefined}
          >
            <ChevronRightIcon size={18} />
          </a>
        </footer>
      )}

      {popover && popoverStyle && (
        <div
          className="bk-popover"
          data-below={popoverBelow}
          onPointerDown={(event) => event.preventDefault()}
          role="toolbar"
          aria-label="Highlight"
          style={popoverStyle}
        >
          {highlightColors.map((color) => (
            <button
              aria-label={`Highlight ${color}`}
              aria-pressed={activeMark?.color === color}
              className="bk-popover__swatch"
              data-color={color}
              key={color}
              onClick={() =>
                popover.kind === 'selection' ? addHighlight(color) : recolor(popover.id, color)
              }
              type="button"
            />
          ))}
          <span aria-hidden="true" className="bk-popover__sep" />
          <button
            className="bk-popover__action"
            onClick={() => {
              if (popover.kind === 'selection') addHighlight('yellow', true)
              else {
                setEditingNoteId(popover.id)
                setPopover(null)
              }
            }}
            type="button"
          >
            Note
          </button>
          <button
            className="bk-popover__action"
            onClick={() =>
              copyText(popover.kind === 'selection' ? popover.text : (activeMark?.text ?? ''))
            }
            type="button"
          >
            Copy
          </button>
          {popover.kind === 'mark' && (
            <button
              className="bk-popover__action"
              onClick={() => removeHighlight(popover.id)}
              type="button"
            >
              Remove
            </button>
          )}
        </div>
      )}

      {panel === 'contents' && (
        <ContentsDrawer
          book={book}
          current={chapterNumber}
          isSubscribed={isSubscribed}
          onClose={() => setPanel(null)}
        />
      )}
      {panel === 'highlights' && (
        <HighlightsDrawer
          highlights={highlights}
          onClose={() => setPanel(null)}
          onRemove={removeHighlight}
          onSelect={jumpToHighlight}
        />
      )}
    </div>
  )
}
