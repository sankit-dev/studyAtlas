import { useMemo, useState } from 'react'
import {
  chapterPath,
  getChapterCount,
  getFreeChapterCount,
  type Book,
} from '../../data/books'
import { useBookAccess } from './access'
import { BookCover } from './BookCover'
import { BooksLayout } from './BooksLayout'
import { enterDelay } from './motion'
import { ChevronLeftIcon, LockIcon } from './icons'
import { loadProgress } from './storage'

const collapsedCount = 5

export function BookDetail({ book }: { book: Book }) {
  const { isSubscribed } = useBookAccess()
  const progress = useMemo(() => loadProgress(book.slug), [book.slug])
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())

  const startChapter = progress?.chapter ?? 1

  return (
    <BooksLayout sky>
      <main className="bk-main bk-main--detail">
        <a className="bk-back" href="/books">
          <ChevronLeftIcon size={16} />
          Books
        </a>

        <section className="bk-detail">
          <div className="bk-detail__cover bk-enter" style={enterDelay(0)}>
            <BookCover book={book} size="lg" />
            <a className="bk-btn bk-btn--primary bk-btn--block" href={chapterPath(book, startChapter)}>
              {progress ? 'Continue reading' : 'Start reading'}
            </a>
          </div>

          <div className="bk-detail__body bk-enter" style={enterDelay(1)}>
            <h1 className="bk-h1 bk-h1--detail">{book.title}</h1>
            <p className="bk-lede">{book.description}</p>
            <div className="bk-meta bk-num">
              {getChapterCount(book)} chapters · {getFreeChapterCount(book)} free · Updated{' '}
              {book.updated}
            </div>

            <h2 className="bk-h2 bk-contents-title">Contents</h2>
            <div className="bk-toc">
              {book.parts.map((part) => {
                const isOpen =
                  expanded.has(part.title) || part.chapters.length <= collapsedCount + 1
                const shown = isOpen ? part.chapters : part.chapters.slice(0, collapsedCount)
                const hidden = part.chapters.length - shown.length

                return (
                  <section className="bk-toc__part" key={part.title}>
                    <h3 className="bk-toc__part-title">{part.title}</h3>
                    <ol className="bk-toc__list">
                      {shown.map((chapter) => {
                        const locked = !chapter.free && !isSubscribed
                        return (
                          <li key={chapter.number}>
                            <a className="bk-toc__row" href={chapterPath(book, chapter.number)}>
                              <span className="bk-toc__num bk-num">{chapter.number}</span>
                              <span className="bk-toc__name">{chapter.title}</span>
                              {chapter.free && !isSubscribed ? (
                                <span className="bk-pill">Free</span>
                              ) : locked ? (
                                <LockIcon aria-label="Locked" className="bk-toc__lock" size={16} />
                              ) : null}
                            </a>
                          </li>
                        )
                      })}
                    </ol>
                    {hidden > 0 && (
                      <button
                        className="bk-toc__more"
                        onClick={() =>
                          setExpanded((current) => new Set(current).add(part.title))
                        }
                        type="button"
                      >
                        + {hidden} more
                      </button>
                    )}
                  </section>
                )
              })}
            </div>
          </div>
        </section>
      </main>
    </BooksLayout>
  )
}
