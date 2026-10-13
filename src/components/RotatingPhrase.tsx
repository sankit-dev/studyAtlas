import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { motionEase } from './motion'

type RotatingPhraseProps = {
  dwellMs?: number
  paused?: boolean
  phrases: readonly string[]
  reducedMotion: boolean
}

export function RotatingPhrase({
  dwellMs = 3200,
  paused = false,
  phrases,
  reducedMotion,
}: RotatingPhraseProps) {
  const [index, setIndex] = useState(0)
  const isFinished = index >= phrases.length - 1
  const shouldRotate = !reducedMotion && !paused && !isFinished

  useEffect(() => {
    if (!shouldRotate) {
      return
    }

    const timer = window.setTimeout(
      () => setIndex((current) => current + 1),
      dwellMs,
    )

    return () => window.clearTimeout(timer)
  }, [index, shouldRotate, dwellMs])

  const visiblePhrase = reducedMotion ? phrases[0] : phrases[index]

  return (
    <span className="rotating-phrase">
      <span className="rotating-phrase__sizer" aria-hidden="true">
        {phrases.map((phrase) => (
          <span key={phrase}>{phrase}</span>
        ))}
      </span>
      <AnimatePresence initial={false} mode="wait">
        <motion.span
          animate={{ opacity: 1 }}
          aria-hidden="true"
          className="rotating-phrase__current"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          key={visiblePhrase}
          transition={{ duration: 0.35, ease: motionEase }}
        >
          {visiblePhrase}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
