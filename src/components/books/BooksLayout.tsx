import type { PropsWithChildren } from 'react'
import { BooksAccount } from './BooksAccount'

type ActiveNav = 'books' | 'pricing'

const navLinks: { label: string; href: string; id?: ActiveNav }[] = [
  { label: 'Library', href: '/library' },
  { label: 'DSA', href: '/dsa' },
  { label: 'Books', href: '/books', id: 'books' },
  { label: 'Pricing', href: '/pricing', id: 'pricing' },
]

type BooksLayoutProps = PropsWithChildren<{
  active?: ActiveNav
  grid?: boolean
}>

export function BooksLayout({ active, grid = false, children }: BooksLayoutProps) {
  return (
    <div className="bk-root">
      {grid && <div aria-hidden="true" className="bk-grid" />}
      <header className="bk-header">
        <div className="bk-header__inner">
          <a className="bk-logo" href="/">
            <span className="bk-logo__mark">S</span>
            <span className="bk-logo__name">StudyAtlas</span>
          </a>
          <nav aria-label="Main" className="bk-nav">
            {navLinks.map((link) => {
              const isActive = link.id === active
              return (
                <a
                  aria-current={isActive ? 'page' : undefined}
                  className="bk-nav__link"
                  data-active={isActive}
                  href={link.href}
                  key={link.href}
                >
                  {link.label}
                </a>
              )
            })}
            <BooksAccount />
          </nav>
        </div>
      </header>
      {children}
    </div>
  )
}
