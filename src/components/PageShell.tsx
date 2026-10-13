import type { PropsWithChildren } from 'react'

type PageShellProps = PropsWithChildren<{
  variant?: 'default' | 'dsa'
}>

export function PageShell({ children, variant = 'default' }: PageShellProps) {
  return (
    <div
      className={`min-h-svh bg-canvas text-foreground transition-colors duration-300 ${
        variant === 'dsa' ? 'dsa-page-shell' : ''
      }`}
    >
      {children}
    </div>
  )
}

export function Wrap({ children }: PropsWithChildren) {
  return (
    <div className="mx-auto w-[min(1160px,calc(100%-48px))] max-[760px]:w-[min(calc(100%-32px),1160px)]">
      {children}
    </div>
  )
}
