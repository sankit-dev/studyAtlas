import type { Book } from '../../data/books'

type BookCoverProps = {
  book: Book
  size?: 'md' | 'lg'
}

export function BookCover({ book, size = 'md' }: BookCoverProps) {
  return (
    <span
      className="bk-cover"
      data-size={size}
      data-tone={book.cover}
      aria-hidden="true"
    >
      <span className="bk-cover__brand">StudyAtlas</span>
      {book.category === 'ai' ? (
        <span className="bk-cover__rings">
          <span />
          <span />
          <span />
        </span>
      ) : (
        <span className="bk-cover__boxes">
          <span>
            <i />
            <b />
            <i />
          </span>
          <span>
            <i data-filled="true" />
            <b />
            <i data-round="true" />
          </span>
        </span>
      )}
      <span className="bk-cover__title">{book.title}</span>
    </span>
  )
}
