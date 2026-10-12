import { useContext, type PropsWithChildren } from 'react'
import { NightSky } from '../NightSky'
import { BooksHeaderContext } from './headerContext'

type BooksLayoutProps = PropsWithChildren<{
  sky?: boolean
}>

export function BooksLayout({ sky = false, children }: BooksLayoutProps) {
  const header = useContext(BooksHeaderContext)
  return (
    <div className="bk-root">
      <div className="bk-site-header">{header}</div>
      {sky && (
        <div className="bk-sky">
          <NightSky className="night-sky--page" variant="books" />
        </div>
      )}
      {children}
    </div>
  )
}
