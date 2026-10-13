import type { PropsWithChildren } from 'react'

type ButtonLinkProps = PropsWithChildren<{
  href: string
  rel?: string
  target?: string
  variant?: 'dark' | 'light' | 'accent'
}>

const variantClasses = {
  accent:
    'border border-action bg-action text-white shadow-[0_4px_14px_color-mix(in_srgb,var(--color-accent-strong)_25%,transparent)] hover:bg-[color-mix(in_srgb,var(--color-accent-strong)_88%,#000)] hover:opacity-100',
  dark: 'bg-inverse text-on-inverse',
  light: 'bg-on-inverse text-inverse',
} as const

export function ButtonLink({
  children,
  href,
  rel,
  target,
  variant = 'dark',
}: ButtonLinkProps) {
  return (
    <a
      className={`button-link button-link--${variant} relative inline-flex min-h-11.5 items-center gap-2 overflow-hidden rounded-full px-5.5 text-sm font-medium no-underline transition-[background,color,opacity] duration-200 hover:opacity-80 motion-reduce:transition-none ${variantClasses[variant]}`}
      href={href}
      rel={rel}
      target={target}
    >
      {children}
    </a>
  )
}
