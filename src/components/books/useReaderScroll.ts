import Lenis from 'lenis'
import { useEffect, useRef, type RefObject } from 'react'

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function isTyping(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
  )
}

/**
 * Eased scrolling for the reader: wheel and trackpad glide to a stop instead
 * of jumping, and Space / Page / arrow keys move with the same easing.
 * Native scrolling is kept for touch and for reduced-motion users.
 */
export function useSmoothScroll(paused: boolean) {
  const lenisRef = useRef<Lenis | null>(null)

  useEffect(() => {
    if (prefersReducedMotion()) return

    const lenis = new Lenis({
      lerp: 0.085,
      wheelMultiplier: 0.9,
      smoothWheel: true,
      prevent: (node) => node.closest?.('.bk-drawer, .bk-panel') != null,
    })
    lenisRef.current = lenis

    let frame = 0
    const tick = (time: number) => {
      lenis.raf(time)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)

    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isTyping(event.target)) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (event.target instanceof HTMLButtonElement && event.key === ' ') return

      const page = window.innerHeight * 0.85
      const steps: Record<string, number> = {
        ArrowDown: 96,
        ArrowUp: -96,
        PageDown: page,
        PageUp: -page,
        ' ': event.shiftKey ? -page : page,
      }
      const step = steps[event.key]
      if (step === undefined) return

      event.preventDefault()
      lenis.scrollTo(lenis.targetScroll + step, { duration: 0.6 })
    }
    window.addEventListener('keydown', onKey)

    return () => {
      window.removeEventListener('keydown', onKey)
      cancelAnimationFrame(frame)
      lenis.destroy()
      lenisRef.current = null
    }
  }, [])

  useEffect(() => {
    const lenis = lenisRef.current
    if (!lenis) return
    if (paused) lenis.stop()
    else lenis.start()
  }, [paused])

  return lenisRef
}

/**
 * Blocks that start below the fold fade in the first time they scroll into
 * view. Blocks already on screen, and anything added later, show at once.
 */
export function useRevealOnScroll(
  containerRef: RefObject<HTMLElement | null>,
  enabled: boolean,
) {
  useEffect(() => {
    const container = containerRef.current
    if (!enabled || !container || prefersReducedMotion()) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.classList.remove('bk-pending')
          entry.target.classList.add('bk-revealed')
          observer.unobserve(entry.target)
        }
      },
      { rootMargin: '0px 0px -6% 0px', threshold: 0.05 },
    )

    // Wait a frame so a restored scroll position is applied first.
    const frame = requestAnimationFrame(() => {
      for (const child of Array.from(container.children)) {
        if (child.getBoundingClientRect().top < window.innerHeight) continue
        child.classList.add('bk-pending')
        observer.observe(child)
      }
    })

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      for (const child of Array.from(container.children)) {
        child.classList.remove('bk-pending')
      }
    }
  }, [containerRef, enabled])
}
