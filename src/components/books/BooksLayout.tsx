import { useContext, type PropsWithChildren } from 'react'
import { BooksHeaderContext } from './headerContext'

type BooksLayoutProps = PropsWithChildren<{
  grid?: boolean
}>

export function BooksLayout({ grid = false, children }: BooksLayoutProps) {
  const header = useContext(BooksHeaderContext)
  return (
    <div className="bk-root">
      {grid && <div aria-hidden="true" className="bk-grid" />}
      <div className="bk-site-header">{header}</div>
      {children}
    </div>
  )
}
