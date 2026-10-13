import { motion } from 'framer-motion'
import { getLearningPathSteps } from '../data/learningPath'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { fadeUp, motionProps, staggerContainer, viewportOnce } from './motion'
import { Wrap } from './PageShell'

type RoadmapProps = {
  completedNoteSlugs: Set<string>
}

function getStepMarker(status: string, index: number) {
  if (status === 'completed') {
    return '✓'
  }

  if (status === 'next-recommended') {
    return '→'
  }

  return String(index + 1).padStart(2, '0')
}

export function Roadmap({ completedNoteSlugs }: RoadmapProps) {
  const reducedMotion = useReducedMotion()
  const motionConfig = motionProps(reducedMotion)
  const pathSteps = getLearningPathSteps(completedNoteSlugs)

  return (
    <Wrap>
      <section
        className="grid grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] gap-[clamp(36px,6vw,88px)] border-t border-divider py-[clamp(64px,9vw,116px)] max-[760px]:grid-cols-1 max-[760px]:gap-9"
        id="roadmap"
        aria-labelledby="roadmap-heading"
      >
        <motion.div
          initial={reducedMotion ? false : 'hidden'}
          whileInView={reducedMotion ? undefined : 'visible'}
          viewport={viewportOnce}
          variants={fadeUp}
          {...motionConfig}
        >
          <h2
            className="m-0 text-[clamp(32px,4.4vw,54px)] leading-[1.02] text-foreground"
            id="roadmap-heading"
          >
            Follow the backend sequence.
          </h2>
          <p className="mt-4.5 mb-0 max-w-[36ch] text-[15px] leading-[1.65] text-secondary">
            Start with computer fundamentals, then move through networks,
            databases, APIs, deployment, and AI-backed backend work.
          </p>
        </motion.div>

        <motion.ol
          className="m-0 list-none p-0"
          initial={reducedMotion ? false : 'hidden'}
          whileInView={reducedMotion ? undefined : 'visible'}
          viewport={viewportOnce}
          variants={staggerContainer}
          {...motionConfig}
        >
          {pathSteps.map((step, index) => (
            <motion.li
              className="grid grid-cols-[34px_minmax(0,1fr)] gap-5.5 border-t border-(--color-soft-line) py-5.5 first:border-t-0 first:pt-0"
              data-state={step.status}
              key={step.track.title}
              variants={fadeUp}
            >
              <span
                className={`pt-0.75 text-sm tabular-nums ${
                  step.status === 'completed'
                    ? 'text-success'
                    : step.status === 'next-recommended'
                      ? 'font-semibold text-highlight'
                      : 'text-secondary'
                }`}
                aria-hidden="true"
              >
                {getStepMarker(step.status, index)}
              </span>
              <div>
                <h3
                  className={`m-0 font-sans text-lg font-semibold tracking-[-0.01em] ${
                    step.status === 'next-recommended'
                      ? 'text-highlight'
                      : 'text-foreground'
                  }`}
                >
                  {step.track.title}
                </h3>
                <p className="mt-1.75 mb-0 text-sm leading-[1.6] text-secondary">
                  {step.track.description}
                </p>
                <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 font-sans text-[13px] text-secondary normal-case tracking-normal">
                  <span className="text-secondary">
                    {step.completedCount} of {step.noteCount} understood
                  </span>
                  {step.nextNote && (
                    <a
                      className="text-highlight transition-colors hover:text-foreground motion-reduce:transition-none"
                      href={`/notes/${step.nextNote.slug}`}
                    >
                      Next: {step.nextNote.title}
                    </a>
                  )}
                </div>
              </div>
            </motion.li>
          ))}
        </motion.ol>
      </section>
    </Wrap>
  )
}
