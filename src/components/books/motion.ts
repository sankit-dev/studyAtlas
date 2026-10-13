import type { CSSProperties } from 'react'

/** Stagger index for `.bk-enter` fade-ins. */
export function enterDelay(index: number) {
  return { '--i': index } as CSSProperties
}
