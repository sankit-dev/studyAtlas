import { useEffect, useState } from 'react'
import { AuthControls } from './AuthControls'
import { Brand } from './Brand'
import { useDonation } from '../lib/donation'

const navigationLinks = [
  { label: 'Roadmap', href: '/#roadmap' },
  { label: 'Library', href: '/library' },
  { label: 'Revise', href: '/library?view=revise' },
  { label: 'DSA', href: '/dsa' },
  { label: 'Books', href: '/books' },
] as const

type HeaderProps = {
  onThemeToggle: () => void
  theme: 'light' | 'dark'
}

export function Header({ onThemeToggle, theme }: HeaderProps) {
  const { openDonation } = useDonation()
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
    if (href === '/library?view=revise') {
      return activePath === href
    }

    if (href === '/library') {
      return activePath === '/library'
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
          aria-label="Support this work"
          className="site-header-donate"
          onClick={() => openDonation()}
          type="button"
        >
          <svg
            aria-hidden="true"
            fill="none"
            height="16"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            viewBox="0 0 24 24"
            width="16"
          >
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          </svg>
          <span>Support</span>
        </button>
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
