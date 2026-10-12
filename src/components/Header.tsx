import { useEffect, useState } from 'react'
import { AuthControls } from './AuthControls'
import { Brand } from './Brand'

const navigationLinks = [
  { label: 'Library', href: '/library' },
  { label: 'DSA', href: '/dsa' },
  { label: 'Books', href: '/books' },
] as const

type HeaderProps = {
  onThemeToggle: () => void
  theme: 'light' | 'dark'
}

export function Header({ onThemeToggle, theme }: HeaderProps) {
  const isDark = theme === 'dark'
  const [activePath, setActivePath] = useState(() =>
    typeof window === 'undefined'
      ? '/'
      : window.location.pathname + window.location.search,
  )

  useEffect(() => {
    const syncActivePath = () =>
      setActivePath(window.location.pathname + window.location.search)

    window.addEventListener('popstate', syncActivePath)

    return () => window.removeEventListener('popstate', syncActivePath)
  }, [])

  const getIsActive = (href: string) => {
    if (href === '/library') {
      return activePath === '/library' || activePath.startsWith('/library?')
    }

    if (href === '/books') {
      return activePath === '/books' || activePath.startsWith('/books/')
    }

    if (href === '/dsa') {
      return activePath === '/dsa' || activePath.startsWith('/dsa/')
    }

    return false
  }

  return (
    <nav aria-label="Primary navigation" className="site-header-nav">
      <Brand />
      <div className="site-header-links">
        {navigationLinks.map((link) => {
          const isActive = getIsActive(link.href)

          return (
            <a
              aria-current={isActive ? 'page' : undefined}
              className="site-nav-link"
              data-active={isActive}
              href={link.href}
              key={link.href}
            >
              {link.label}
            </a>
          )
        })}
      </div>
      <div className="site-header-actions">
        <button
          aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
          aria-pressed={isDark}
          className="theme-toggle"
          onClick={onThemeToggle}
          title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
          type="button"
        >
          <span aria-hidden="true">{isDark ? '☾' : '☀'}</span>
        </button>
        <div className="site-header-auth">
          <AuthControls />
        </div>
      </div>
    </nav>
  )
}
