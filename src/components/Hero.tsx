import { motion } from 'framer-motion'
import { useState } from 'react'
import type { Note } from '../data/tracks'
import type { LearningPathStep } from '../data/learningPath'
import { flattenNotes, totalNoteCount, tracks } from '../data/tracks'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { ButtonLink } from './Button'
import { HeroConstellation } from './HeroConstellation'
import { fadeUp, motionProps, staggerContainer } from './motion'
import { Wrap } from './PageShell'
import { RotatingPhrase } from './RotatingPhrase'

const headlinePhrases = [
  'in the right order.',
  'revised in ten minutes.',
  'ready for the interview.',
  'one note at a time.',
] as const

const modeLinks = [
  { label: 'Learn in order', href: '/library' },
  { label: 'Quick revision', href: '/library?view=revise' },
  { label: 'Interview practice', href: '/dsa' },
] as const

const mustKnowCount = tracks.reduce(
  (total, track) =>
    total +
    flattenNotes(track.topics).filter((note) => note.priority === 'Must Know')
      .length,
  0,
)

type HeroProps = {
  currentStep: LearningPathStep
  pathSteps: LearningPathStep[]
  lastCompletedNote?: Note
  overallProgress: {
    completedCount: number
    totalCount: number
  }
}

export function Hero({
  currentStep,
  pathSteps,
  lastCompletedNote,
  overallProgress,
}: HeroProps) {
  const reducedMotion = useReducedMotion()
  const motionConfig = motionProps(reducedMotion)
  const [isHeadlinePaused, setIsHeadlinePaused] = useState(false)
  const nextNote =
    currentStep.status === 'completed'
      ? undefined
      : currentStep.nextNote ?? currentStep.firstNote
  const continueNote = nextNote ?? lastCompletedNote
  const hasProgress = overallProgress.completedCount > 0

  return (
    <Wrap>
      <section className="hero" id="top">
        <motion.div
          className="hero__copy"
          initial={reducedMotion ? false : 'hidden'}
          animate={reducedMotion ? undefined : 'visible'}
          variants={staggerContainer}
          {...motionConfig}
        >
          <motion.h1
            onBlur={() => setIsHeadlinePaused(false)}
            onFocus={() => setIsHeadlinePaused(true)}
            onMouseEnter={() => setIsHeadlinePaused(true)}
            onMouseLeave={() => setIsHeadlinePaused(false)}
            variants={fadeUp}
          >
            Backend engineering,
            <br />
            <span className="sr-only">{headlinePhrases[0]}</span>
            <RotatingPhrase
              paused={isHeadlinePaused}
              phrases={headlinePhrases}
              reducedMotion={reducedMotion}
            />
          </motion.h1>
          <motion.p variants={fadeUp}>
            Short notes, in order. Built to learn once and revise fast:
            networks, databases, APIs, deployment and the interview questions
            that come with them.
          </motion.p>
          <motion.div className="hero__actions" variants={fadeUp}>
            <ButtonLink
              href={continueNote ? `/notes/${continueNote.slug}` : '/library'}
              variant="accent"
            >
              {hasProgress ? 'Continue reading' : 'Start the first note'}
              <span className="btn-arrow" aria-hidden="true">
                →
              </span>
            </ButtonLink>
            <a className="hero__secondary" href="/library">
              Browse the library
            </a>
          </motion.div>
          <motion.ul className="hero__modes" variants={fadeUp}>
            {modeLinks.map((mode) => (
              <li key={mode.label}>
                <a href={mode.href}>{mode.label}</a>
              </li>
            ))}
          </motion.ul>
          <motion.p className="hero__stats" variants={fadeUp}>
            {totalNoteCount} notes · {tracks.length} tracks · {mustKnowCount}{' '}
            must-know
          </motion.p>
        </motion.div>

        <motion.aside
          className="hero__path"
          aria-label="Your learning path"
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={reducedMotion ? undefined : { opacity: 1 }}
          transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1], delay: 0.3 }}
        >
          <HeroConstellation steps={pathSteps} />
          <div className="hero__path-info">
            <p className="hero__path-head">
              <span>Your path</span>
              <span>
                {overallProgress.completedCount} / {overallProgress.totalCount}{' '}
                understood
              </span>
            </p>
            <p className="hero__path-track">{currentStep.track.title}</p>
            <p className="hero__path-note">
              {continueNote
                ? `Up next: ${continueNote.title}`
                : 'Every track understood. Nice work.'}
            </p>
            {continueNote && (
              <a className="hero__progress-link" href={`/notes/${continueNote.slug}`}>
                Continue
                <span aria-hidden="true">→</span>
              </a>
            )}
          </div>
        </motion.aside>
      </section>
    </Wrap>
  )
}
