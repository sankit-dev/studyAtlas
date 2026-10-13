import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import type { Note, Track } from '../data/tracks'
import { getTrackProgress } from '../data/learningPath'
import { flattenNotes, tracks } from '../data/tracks'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { useRoute } from '../hooks/useRoute'
import { replaceRoute } from '../lib/router'
import {
  fadeIn,
  fadeUp,
  motionProps,
  staggerContainer,
  viewportOnce,
} from './motion'
import { NightSky } from './NightSky'
import { Wrap } from './PageShell'
import { RevisionView } from './RevisionView'

type LibraryBranch = {
  description: string
  label: string
  shortLabel: string
  trackTitles: string[]
}

const libraryBranches: LibraryBranch[] = [
  {
    description: 'OS, networks, OOP, and databases before framework-specific work.',
    label: 'Computer Fundamentals',
    shortLabel: 'Fundamentals',
    trackTitles: [
      'Operating Systems',
      'Computer Networks',
      'Object-Oriented Programming',
      'Databases & SQL',
    ],
  },
  {
    description: 'JavaScript, React, APIs, databases, and full-stack projects.',
    label: 'MERN / Full Stack',
    shortLabel: 'MERN',
    trackTitles: [
      'JavaScript',
      'React / Namaste React',
      'Node.js',
      'Express.js',
      'MongoDB',
      'MERN Integration',
      'Git & GitHub',
      'Docker',
    ],
  },
  {
    description: 'Source control, containers, cloud, and automated delivery.',
    label: 'DevOps & Tools',
    shortLabel: 'DevOps',
    trackTitles: ['Git & GitHub', 'Docker', 'AWS Fundamentals', 'GitHub CI/CD'],
  },
  {
    description: 'LLM concepts, RAG, agents, and backend AI integration.',
    label: 'AI / ML',
    shortLabel: 'AI/ML',
    trackTitles: ['AI for Backend Developers'],
  },
]

const allBranchLabel = 'All'
const tabClassName =
  "relative shrink-0 border-0 bg-transparent pb-3.5 text-sm font-medium text-secondary transition-colors after:absolute after:right-0 after:-bottom-px after:left-0 after:h-px after:bg-foreground after:opacity-0 hover:text-foreground motion-reduce:transition-none"
const activeTabClassName = 'text-foreground after:opacity-100'
const modeButtonClassName =
  "rounded-full border-0 bg-transparent px-3.5 py-1.5 text-[13px] font-medium text-secondary transition-colors hover:text-foreground aria-pressed:bg-[color-mix(in_srgb,var(--color-accent-strong)_14%,transparent)] aria-pressed:text-foreground motion-reduce:transition-none"

function getTrackSearchText(track: Track) {
  return [
    track.title,
    track.description,
    ...flattenNotes(track.topics).flatMap((topic) => [
      topic.title,
      topic.description,
      topic.priority ?? '',
    ]),
  ]
    .join(' ')
    .toLowerCase()
}

const getMustKnowNotes = (track: Track) =>
  flattenNotes(track.topics).filter((note) => note.priority === 'Must Know')

type LibraryProps = {
  completedNoteSlugs: Set<string>
}

export function Library({ completedNoteSlugs }: LibraryProps) {
  const reducedMotion = useReducedMotion()
  const motionConfig = motionProps(reducedMotion)
  const route = useRoute()
  const mustKnowOnly =
    new URLSearchParams(route.split('?')[1] ?? '').get('view') === 'revise'
  const [query, setQuery] = useState('')

  const selectMode = (revise: boolean) => {
    if (revise === mustKnowOnly) return

    replaceRoute(revise ? '/library?view=revise' : '/library')
    setExpandedTrack(null)
  }
  const [activeBranch, setActiveBranch] = useState<string>(allBranchLabel)
  const [expandedTrack, setExpandedTrack] = useState<string | null>(null)
  const [isTrackListExpanded, setIsTrackListExpanded] = useState(false)
  const activeBranchConfig = libraryBranches.find(
    (branch) => branch.label === activeBranch,
  )

  const visibleTracks = useMemo(() => {
    const term = query.trim().toLowerCase()
    const scopedTracks = activeBranchConfig
      ? tracks.filter((track) =>
          activeBranchConfig.trackTitles.includes(track.title),
        )
      : tracks

    return scopedTracks.filter((track) => {
      const matchesSearch = !term || getTrackSearchText(track).includes(term)
      const matchesPriority =
        !mustKnowOnly || getMustKnowNotes(track).length > 0

      return matchesSearch && matchesPriority
    })
  }, [activeBranchConfig, query, mustKnowOnly])
  const visibleTrackLimit = 6
  const hasMoreTracks = !mustKnowOnly && visibleTracks.length > visibleTrackLimit
  const mustKnowNotes = visibleTracks.flatMap(getMustKnowNotes)
  const mustKnowDone = mustKnowNotes.filter((note) =>
    completedNoteSlugs.has(note.slug),
  ).length
  const displayedTracks = isTrackListExpanded
    ? visibleTracks
    : visibleTracks.slice(0, visibleTrackLimit)

  function handleBranchSelect(item: string) {
    setActiveBranch(item)
    setExpandedTrack(null)
    setIsTrackListExpanded(false)
  }

  return (
    <Wrap>
      <section className="py-[clamp(56px,8vw,104px)] pb-[clamp(64px,9vw,120px)]" id="library">
        <NightSky className="night-sky--page" variant="library" />
        <motion.header
          className="max-w-[620px]"
          initial={reducedMotion ? false : 'hidden'}
          whileInView={reducedMotion ? undefined : 'visible'}
          viewport={viewportOnce}
          variants={fadeUp}
          {...motionConfig}
        >
          <h1 className="m-0 text-[clamp(38px,5.2vw,64px)] leading-none text-foreground">
            {mustKnowOnly ? 'Quick revision.' : 'Pick a track. Follow the order.'}
          </h1>
          <p className="mt-4.5 mb-0 text-base leading-[1.6] text-secondary">
            {mustKnowOnly
              ? `${mustKnowNotes.length} must-know notes across ${visibleTracks.length} tracks, ${mustKnowDone} revised so far. Skim these before an interview.`
              : 'Focused backend topics, arranged for learning, revision, and interview prep.'}
          </p>
        </motion.header>

        <motion.div
          className="mt-11 flex flex-wrap items-center justify-between gap-x-8 gap-y-4 border-b border-divider max-[760px]:flex-col max-[760px]:items-stretch max-[760px]:gap-1"
          initial={reducedMotion ? false : 'hidden'}
          animate={reducedMotion ? undefined : 'visible'}
          variants={fadeIn}
          {...motionConfig}
        >
          <label className="flex basis-[280px] items-center gap-2.5 text-secondary max-[760px]:basis-auto">
            <span className="text-[17px] leading-none" aria-hidden="true">⌕</span>
            <input
              aria-label="Search learning topics"
              className="w-full border-0 bg-transparent py-3 text-[15px] text-foreground outline-none placeholder:text-secondary"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search tracks or topics"
              value={query}
            />
          </label>

          <div
            className="flex flex-wrap items-end gap-6 max-[760px]:flex-nowrap max-[760px]:gap-5 max-[760px]:overflow-x-auto max-[760px]:[scrollbar-width:none] max-[760px]:[&::-webkit-scrollbar]:hidden"
            aria-label="Learning branches"
          >
            <button
              className={`${tabClassName} ${activeBranch === allBranchLabel ? activeTabClassName : ''}`}
              onClick={() => handleBranchSelect(allBranchLabel)}
              type="button"
            >
              All
            </button>

            {libraryBranches.map((branch) => (
              <button
                className={`${tabClassName} ${activeBranch === branch.label ? activeTabClassName : ''}`}
                key={branch.label}
                onClick={() => handleBranchSelect(branch.label)}
                type="button"
              >
                {branch.shortLabel}
              </button>
            ))}
          </div>

          <div className="mb-2.5 inline-flex rounded-full border border-divider p-0.75" role="group" aria-label="Library mode">
            <button
              aria-pressed={!mustKnowOnly}
              className={modeButtonClassName}
              onClick={() => selectMode(false)}
              type="button"
            >
              Full library
            </button>
            <button
              aria-pressed={mustKnowOnly}
              className={modeButtonClassName}
              onClick={() => selectMode(true)}
              type="button"
            >
              Quick revision
            </button>
          </div>
        </motion.div>

        <motion.div
          className="m-0 list-none p-0"
          key={activeBranch + query + mustKnowOnly}
          initial={reducedMotion ? false : 'hidden'}
          animate={reducedMotion ? undefined : 'visible'}
          variants={staggerContainer}
          {...motionConfig}
        >
          {mustKnowOnly ? (
            <RevisionView
              completedNoteSlugs={completedNoteSlugs}
              tracks={visibleTracks}
            />
          ) : displayedTracks.map((track) => (
            <TrackRow
              completedNoteSlugs={completedNoteSlugs}
              isExpanded={expandedTrack === track.title}
              key={track.title}
              onToggle={() =>
                setExpandedTrack((current) =>
                  current === track.title ? null : track.title,
                )
              }
              track={track}
            />
          ))}
        </motion.div>

        {hasMoreTracks && (
          <div className="mt-7 flex justify-center">
            <button
              aria-expanded={isTrackListExpanded}
              className="border-0 bg-transparent p-2 text-sm font-medium text-secondary hover:text-foreground"
              onClick={() =>
                setIsTrackListExpanded((currentValue) => !currentValue)
              }
              type="button"
            >
              {isTrackListExpanded
                ? 'Show fewer tracks'
                : `Show all ${visibleTracks.length} tracks`}
            </button>
          </div>
        )}

        {visibleTracks.length === 0 && (
          <p className="m-0 py-16 pb-6 text-center text-[15px] text-secondary">
            No topic found. Try SQL, HTTP, or AI.
          </p>
        )}
      </section>
    </Wrap>
  )
}

type TrackRowProps = {
  completedNoteSlugs: Set<string>
  isExpanded: boolean
  onToggle: () => void
  track: Track
}

function TrackRow({
  completedNoteSlugs,
  isExpanded,
  onToggle,
  track,
}: TrackRowProps) {
  const firstTopic = track.topics[0]
  const flatNotes = flattenNotes(track.topics)
  const { completedCount, nextNote, noteCount } = getTrackProgress(
    track,
    completedNoteSlugs,
  )
  const continueNote = nextNote ?? firstTopic
  const continueHref = continueNote ? `/notes/${continueNote.slug}` : '#roadmap'
  const progressPercent = noteCount
    ? Math.round((completedCount / noteCount) * 100)
    : 0
  const isCompleted = completedCount === noteCount
  const actionLabel = isCompleted
    ? 'Review'
    : completedCount > 0
      ? 'Continue'
      : 'Start'

  const renderTopic = (topic: Note) => {
    const topicIndex = flatNotes.findIndex(
      (candidate) => candidate.slug === topic.slug,
    )
    const topicComplete = completedNoteSlugs.has(topic.slug)
    const isNext = topic.slug === nextNote?.slug

    return (
      <li
        data-complete={topicComplete}
        data-next={isNext}
        key={topic.slug}
      >
        <span className="topic-list__index">
          {topicComplete
            ? '✓'
            : isNext
              ? '→'
              : String(topicIndex + 1).padStart(2, '0')}
        </span>
        <a href={`/notes/${topic.slug}`}>
          <strong>{topic.title}</strong>
          <span>{topic.description}</span>
        </a>
        {topic.children?.length ? (
          <ol className="topic-list__children">
            {topic.children.map((childTopic) => renderTopic(childTopic))}
          </ol>
        ) : null}
      </li>
    )
  }

  return (
    <motion.article
      className={`border-b border-divider ${isExpanded ? 'bg-[color-mix(in_srgb,var(--color-surface)_60%,transparent)]' : ''}`}
      variants={fadeUp}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_170px_auto] items-center gap-8 py-6 max-[980px]:grid-cols-1 max-[980px]:gap-4">
        <div>
          <h3 className="m-0 font-sans text-xl font-semibold tracking-[-0.01em] text-foreground">{track.title}</h3>
          <p className="mt-1.75 mb-0 max-w-[62ch] text-sm leading-[1.55] text-secondary">{track.description}</p>
        </div>

        <div className="text-[13px] whitespace-nowrap text-secondary tabular-nums max-[980px]:order-2">
          <span>
            {completedCount} of {noteCount} understood
          </span>
          <i className="mt-2.5 block h-0.5 bg-divider" aria-hidden="true">
            <b className="block h-full bg-highlight" style={{ width: `${progressPercent}%` }} />
          </i>
        </div>

        <div className="flex items-center gap-4.5 max-[980px]:justify-between">
          <a className="text-sm font-semibold whitespace-nowrap text-highlight transition-colors hover:text-foreground motion-reduce:transition-none" href={continueHref}>
            {actionLabel}
          </a>
          <button
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Hide curriculum' : 'View curriculum'}
            className="grid size-8 shrink-0 place-items-center rounded-full border border-divider bg-transparent text-base leading-none text-secondary transition-colors hover:border-foreground hover:text-foreground motion-reduce:transition-none"
            onClick={onToggle}
            type="button"
          >
            {isExpanded ? '−' : '+'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="overflow-hidden pt-1 pb-7">
          <ol className="topic-list">
            {track.topics.map((topic) => renderTopic(topic))}
          </ol>
        </div>
      )}
    </motion.article>
  )
}
