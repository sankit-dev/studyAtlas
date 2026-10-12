import { useState } from 'react'
import {
  bookCategories,
  bookPath,
  books,
  chapterPath,
  getBook,
  getChapter,
  getChapterCount,
  getFreeChapterCount,
  type BookCategory,
} from '../../data/books'
import { BookCover } from './BookCover'
import { BooksLayout } from './BooksLayout'
import { loadAllProgress } from './storage'

export function BooksCatalogue() {
  const [filter, setFilter] = useState<BookCategory | 'all'>('all')
  const [progress] = useState(loadAllProgress)

  const latest = Object.values(progress)
    .filter((entry) => getBook(entry.slug))
    .sort((a, b) => b.updatedAt - a.updatedAt)[0]
  const latestBook = latest ? getBook(latest.slug) : undefined
  const latestChapter =
    latestBook && latest ? getChapter(latestBook, latest.chapter) : undefined
  const latestPercent =
    latestBook && latest
      ? Math.round(
          ((latest.chapter - 1 + latest.position) / getChapterCount(latestBook)) *
            100,
        )
      : 0

  const visibleBooks =
    filter === 'all' ? books : books.filter((book) => book.category === filter)

  return (
    <BooksLayout active="books" grid>
      <main className="bk-main">
        <section className="bk-intro">
          <h1 className="bk-h1">Books for engineering interviews</h1>
          <p className="bk-lede">
            Read in the browser. Highlight, take notes, pick up where you left off.
          </p>
        </section>

        {latestBook && latest && latestChapter && (
          <section aria-label="Continue reading" className="bk-continue">
            <div className="bk-continue__body">
              <div className="bk-continue__row">
                <strong>{latestBook.title}</strong>
                <span className="bk-num">
                  Ch. {latest.chapter} · {latestPercent}%
                </span>
              </div>
              <div className="bk-bar">
                <div style={{ width: `${latestPercent}%` }} />
              </div>
            </div>
            <a className="bk-btn bk-btn--primary" href={chapterPath(latestBook, latest.chapter)}>
              Resume
            </a>
          </section>
        )}

        <section aria-labelledby="all-books" className="bk-stack">
          <div className="bk-section-head">
            <h2 className="bk-h2" id="all-books">
              All books
            </h2>
            <div aria-label="Filter" className="bk-tabs" role="tablist">
              {bookCategories.map((category) => (
                <button
                  aria-selected={filter === category.id}
                  className="bk-tab"
                  key={category.id}
                  onClick={() => setFilter(category.id)}
                  role="tab"
                  type="button"
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bk-cards">
            {visibleBooks.map((book) => {
              const saved = progress[book.slug]
              return (
                <article className="bk-card" key={book.slug}>
                  <a aria-label={book.title} className="bk-card__cover" href={bookPath(book)}>
                    <BookCover book={book} />
                  </a>
                  <div className="bk-card__body">
                    <h3 className="bk-h3">
                      <a href={bookPath(book)}>{book.title}</a>
                    </h3>
                    <p className="bk-muted">{book.description}</p>
                    <div className="bk-meta bk-num">
                      {getChapterCount(book)} chapters · {getFreeChapterCount(book)} free
                    </div>
                    <div className="bk-card__actions">
                      <a
                        className="bk-btn bk-btn--primary"
                        href={chapterPath(book, saved?.chapter ?? 1)}
                      >
                        {saved ? 'Continue reading' : 'Start reading'}
                      </a>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      </main>
    </BooksLayout>
  )
}
