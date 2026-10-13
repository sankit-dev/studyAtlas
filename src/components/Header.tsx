import { AuthControls } from './AuthControls'
import { Brand } from './Brand'

const navigationLinks = [
  { label: 'Library', href: '/library' },
  { label: 'DSA', href: '/dsa' },
  { label: 'Books', href: '/books' },
] as const

type HeaderProps = {
  activePath: string
  onThemeToggle: () => void
  theme: 'light' | 'dark'
}

export function Header({ activePath, onThemeToggle, theme }: HeaderProps) {
  const isDark = theme === 'dark'

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
    <nav
      aria-label="Primary navigation"
      className="mx-auto flex min-h-18 w-[min(1120px,calc(100%-48px))] items-center gap-7 py-4 max-[760px]:min-h-16 max-[760px]:w-[min(calc(100%-32px),1120px)] max-[760px]:gap-3.5 print:hidden"
    >
      <Brand />
      <div className="mr-auto flex items-center gap-6 max-[760px]:hidden">
        {navigationLinks.map((link) => {
          const isActive = getIsActive(link.href)

          return (
            <a
              aria-current={isActive ? 'page' : undefined}
              className="relative inline-flex min-h-8.5 items-center text-sm font-normal text-secondary transition-colors after:absolute after:right-0 after:bottom-0.5 after:left-0 after:h-px after:bg-current after:opacity-0 hover:text-foreground data-[active=true]:text-foreground data-[active=true]:after:opacity-50 motion-reduce:transition-none"
              data-active={isActive}
              href={link.href}
              key={link.href}
            >
              {link.label}
            </a>
          )
        })}
      </div>
      <div className="flex items-center gap-3 text-[13px] font-medium text-secondary max-[640px]:gap-2.5">
        <button
          aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
          aria-pressed={isDark}
          className="grid size-8.5 shrink-0 place-items-center rounded-full border border-divider bg-transparent text-[15px] leading-none text-secondary transition-colors hover:border-foreground hover:text-foreground motion-reduce:transition-none"
          onClick={onThemeToggle}
          title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
          type="button"
        >
          <span aria-hidden="true">{isDark ? '☾' : '☀'}</span>
        </button>
        <div className="flex items-center">
          <AuthControls />
        </div>
      </div>
    </nav>
  )
}
