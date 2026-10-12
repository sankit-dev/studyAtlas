import { useEffect, useRef, useState } from 'react'
import { authClient } from '../../lib/auth'
import { signInWithGithub } from './access'

function initials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email || 'U'
  const parts = source.split(/\s+/)
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : source.slice(0, 2))
    .toUpperCase()
}

export function BooksAccount() {
  const { data: session } = authClient.useSession()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const user = session?.user

  if (!user) {
    return (
      <button className="bk-btn bk-btn--ghost bk-btn--sm" onClick={signInWithGithub} type="button">
        Sign in
      </button>
    )
  }

  return (
    <div className="bk-account" ref={menuRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account"
        className="bk-account__avatar"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        {user.image ? <img alt="" src={user.image} /> : initials(user.name, user.email)}
      </button>
      {open && (
        <div className="bk-account__menu" role="menu">
          <div className="bk-account__who">
            {user.name && <strong>{user.name}</strong>}
            <span>{user.email}</span>
          </div>
          <button
            className="bk-account__item"
            onClick={() => {
              setOpen(false)
              void authClient.signOut()
            }}
            role="menuitem"
            type="button"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
