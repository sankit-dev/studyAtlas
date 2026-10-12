import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import type { Note, Track } from '../data/tracks'
import { getTrackProgress } from '../data/learningPath'
import { flattenNotes, tracks } from '../data/tracks'
import { useReducedMotion } from '../hooks/useReducedMotion'
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

const readReviseFromUrl = () =>
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('view') === 'revise'

const getMustKnowNotes = (track: Track) =>
  flattenNotes(track.topics).filter((note) => note.priority === 'Must Know')

type LibraryProps = {
  completedNoteSlugs: Set<string>
}

export function Library({ completedNoteSlugs }: LibraryProps) {
  const reducedMotion = useReducedMotion()
  const motionConfig = motionProps(reducedMotion)
  const [mustKnowOnly, setMustKnowOnly] = useState(readReviseFromUrl)
  const [query, setQuery] = useState('')

  useEffect(() => {
    const syncFromUrl = () => setMustKnowOnly(readReviseFromUrl())

    window.addEventListener('popstate', syncFromUrl)

    return () => window.removeEventListener('popstate', syncFromUrl)
  }, [])

  const selectMode = (revise: boolean) => {
    if (revise === mustKnowOnly) return

    window.history.replaceState(
      null,
      '',
      revise ? '/library?view=revise' : '/library',
    )
    window.dispatchEvent(new PopStateEvent('popstate'))
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
      <section className="library" id="library">
        <NightSky className="night-sky--page" variant="library" />
        <motion.header
          className="library__header"
          initial={reducedMotion ? false : 'hidden'}
          whileInView={reducedMotion ? undefined : 'visible'}
          viewport={viewportOnce}
          variants={fadeUp}
          {...motionConfig}
        >
          <h1>
            {mustKnowOnly ? 'Quick revision.' : 'Pick a track. Follow the order.'}
          </h1>
          <p>
            {mustKnowOnly
              ? `${mustKnowNotes.length} must-know notes across ${visibleTracks.length} tracks, ${mustKnowDone} revised so far. Skim these before an interview.`
              : 'Focused backend topics, arranged for learning, revision, and interview prep.'}
          </p>
        </motion.header>

        <motion.div
          className="library__toolbar"
          initial={reducedMotion ? false : 'hidden'}
          animate={reducedMotion ? undefined : 'visible'}
          variants={fadeIn}
          {...motionConfig}
        >
          <label className="lib-search">
            <span aria-hidden="true">⌕</span>
            <input
              aria-label="Search learning topics"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search tracks or topics"
              value={query}
            />
          </label>

          <div className="lib-tabs" aria-label="Learning branches">
            <button
              className={activeBranch === allBranchLabel ? 'is-active' : ''}
              onClick={() => handleBranchSelect(allBranchLabel)}
              type="button"
            >
              All
            </button>

            {libraryBranches.map((branch) => (
              <button
                className={activeBranch === branch.label ? 'is-active' : ''}
                key={branch.label}
                onClick={() => handleBranchSelect(branch.label)}
                type="button"
              >
                {branch.shortLabel}
              </button>
            ))}
          </div>

          <div className="lib-mode" role="group" aria-label="Library mode">
            <button
              aria-pressed={!mustKnowOnly}
              onClick={() => selectMode(false)}
              type="button"
            >
              Full library
            </button>
            <button
              aria-pressed={mustKnowOnly}
              onClick={() => selectMode(true)}
              type="button"
            >
              Quick revision
            </button>
          </div>
        </motion.div>

        <motion.div
          className="library__list"
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
          <div className="library__more">
            <button
              aria-expanded={isTrackListExpanded}
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
          <p className="library__empty">No topic found. Try SQL, HTTP, or AI.</p>
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
  const continueHref = continueNote ? `#/notes/${continueNote.slug}` : '#roadmap'
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
      className={`track-row ${isExpanded ? 'is-expanded' : ''}`}
      variants={fadeUp}
    >
      <div className="track-row__main">
        <div>
          <h3 className="track-row__title">{track.title}</h3>
          <p className="track-row__desc">{track.description}</p>
        </div>

        <div className="track-row__progress">
          <span>
            {completedCount} of {noteCount} understood
          </span>
          <i className="track-row__meter" aria-hidden="true">
            <b style={{ width: `${progressPercent}%` }} />
          </i>
        </div>

        <div className="track-row__actions">
          <a className="track-row__start" href={continueHref}>
            {actionLabel}
          </a>
          <button
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Hide curriculum' : 'View curriculum'}
            className="track-row__toggle"
            onClick={onToggle}
            type="button"
          >
            {isExpanded ? '−' : '+'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="track-row__panel">
          <ol className="topic-list">
            {track.topics.map((topic) => renderTopic(topic))}
          </ol>
        </div>
      )}
    </motion.article>
  )
}
