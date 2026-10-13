import type { ReactNode } from 'react'
import { getBook } from '../../data/books'
import type { BooksRoute } from '../../lib/router'
import '../../books.css'
import { BookDetail } from './BookDetail'
import { BookReader } from './BookReader'
import { BooksCatalogue } from './BooksCatalogue'
import { BooksLayout } from './BooksLayout'
import { BooksHeaderContext } from './headerContext'
import { PricingPage } from './PricingPage'

function NotFound() {
  return (
    <BooksLayout>
      <main className="bk-main bk-main--center">
        <h1 className="bk-h1 bk-center">Book not found</h1>
        <a className="bk-btn bk-btn--primary" href="/books">
          All books
        </a>
      </main>
    </BooksLayout>
  )
}

type BooksAppProps = {
  route: BooksRoute
  header: ReactNode
}

export function BooksApp({ route, header }: BooksAppProps) {
  return (
    <BooksHeaderContext.Provider value={header}>
      <BooksPage route={route} />
    </BooksHeaderContext.Provider>
  )
}

function BooksPage({ route }: { route: BooksRoute }) {
  if (route.kind === 'catalogue') return <BooksCatalogue />
  if (route.kind === 'pricing') return <PricingPage />

  const book = getBook(route.slug)
  if (!book) return <NotFound />

  if (route.kind === 'book') return <BookDetail book={book} />
  return (
    <BookReader
      book={book}
      chapterNumber={route.chapter}
      key={`${book.slug}:${route.chapter}`}
    />
  )
}
