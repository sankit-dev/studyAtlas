import { useEffect, useMemo, useRef, useState } from 'react'
import {
  dsaQuestById,
  dsaQuests,
  dsaSections,
  getDsaSectionQuests,
  type DsaQuest,
  type DsaSectionId,
} from '../data/dsaCourse'
import { authClient } from '../lib/auth'
import {
  fetchDsaProgress,
  markDsaQuestOutcome,
  markDsaReviewComplete,
  syncDsaProgress,
} from '../lib/dsaProgress'
import { NightSky } from './NightSky'
import { Wrap } from './PageShell'

type ProgressOutcome = 'solved' | 'guided' | 'review'

type QuestProgress = {
  outcome: ProgressOutcome
  reviewDueAt?: string
  reviewStep: number
  updatedAt: string
}

type DsaProgress = Record<string, QuestProgress>

type DsaCourseProps = {
  activeQuestId: string | null
  onNavigateQuest: (questId: string) => void
}

const progressStorageKey = 'learning-atlas-dsa-progress-v1'
const reviewIntervalsInDays = [1, 3, 8, 21]

const outcomeLabel: Record<ProgressOutcome, string> = {
  solved: 'Solved myself',
  guided: 'Solved with support',
  review: 'Review later',
}

function getInitialProgress(): DsaProgress {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const savedProgress = window.localStorage.getItem(progressStorageKey)

    if (!savedProgress) {
      return {}
    }

    const parsedProgress: unknown = JSON.parse(savedProgress)

    if (!parsedProgress || typeof parsedProgress !== 'object' || Array.isArray(parsedProgress)) {
      return {}
    }

    return Object.fromEntries(
      Object.entries(parsedProgress).filter(([questId, item]) => {
        if (!dsaQuestById.has(questId) || !item || typeof item !== 'object') {
          return false
        }

        const progress = item as Partial<QuestProgress>
        return (
          (progress.outcome === 'solved' ||
            progress.outcome === 'guided' ||
            progress.outcome === 'review') &&
          typeof progress.reviewStep === 'number' &&
          typeof progress.updatedAt === 'string'
        )
      }),
    ) as DsaProgress
  } catch {
    return {}
  }
}

function addDays(days: number) {
  const nextDate = new Date()
  nextDate.setDate(nextDate.getDate() + days)
  return nextDate.toISOString()
}

function formatShortDate(value?: string) {
  if (!value) {
    return 'complete'
  }

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
  }).format(new Date(value))
}

function isReviewDue(value?: string) {
  return Boolean(value) && new Date(value as string).getTime() <= Date.now()
}

function getSectionIndex(sectionId: DsaSectionId) {
  return dsaSections.findIndex((section) => section.id === sectionId)
}

function isProgressed(progress: DsaProgress, questId: string) {
  return Boolean(progress[questId])
}

function isSectionUnlocked(sectionId: DsaSectionId, progress: DsaProgress) {
  const sectionIndex = getSectionIndex(sectionId)

  if (sectionIndex <= 0) {
    return true
  }

  const previousSection = dsaSections[sectionIndex - 1]

  return getDsaSectionQuests(previousSection.id).every((quest) =>
    isProgressed(progress, quest.id),
  )
}

function isQuestUnlocked(quest: DsaQuest, progress: DsaProgress) {
  return (
    isSectionUnlocked(quest.section, progress) &&
    (!quest.prerequisiteId || isProgressed(progress, quest.prerequisiteId))
  )
}

function getFirstIncompleteQuest(progress: DsaProgress) {
  return dsaQuests.find(
    (quest) => isQuestUnlocked(quest, progress) && !isProgressed(progress, quest.id),
  )
}

function getSectionNumber(sectionId: DsaSectionId) {
  return String(getSectionIndex(sectionId) + 1).padStart(2, '0')
}

function OriginalQuestBrief({ quest }: { quest: DsaQuest }) {
  if (quest.id === 'meeting-overlap-check') {
    return (
      <p>
        Write <code>hasMeetingOverlap(meetings)</code>. Each meeting is a
        <code>[start, end]</code> pair. Return whether any two meetings overlap.
        Meetings that touch at an endpoint do not overlap.
      </p>
    )
  }

  return (
    <p>
      Build a <code>Trie</code> with <code>insert(word)</code>,{' '}
      <code>search(word)</code>, and <code>startsWith(prefix)</code>. Use lowercase
      English words and make shared prefixes reuse the same nodes.
    </p>
  )
}

export function DsaCourse({ activeQuestId, onNavigateQuest }: DsaCourseProps) {
  const { data: session } = authClient.useSession()
  const [progress, setProgress] = useState<DsaProgress>(getInitialProgress)
  const [revealedHints, setRevealedHints] = useState<Record<string, number>>({})
  const hasLoadedRemoteProgress = useRef(false)
  const syncedProgressSignature = useRef('')

  // Persist to localStorage whenever progress changes
  useEffect(() => {
    window.localStorage.setItem(progressStorageKey, JSON.stringify(progress))
  }, [progress])

  // On login: fetch remote progress and merge into local state
  useEffect(() => {
    if (!session?.user || hasLoadedRemoteProgress.current) {
      return
    }

    hasLoadedRemoteProgress.current = true

    void fetchDsaProgress()
      .then((remoteRecords) => {
        setProgress((currentProgress) => {
          const next = { ...currentProgress }

          remoteRecords.forEach((record) => {
            const local = currentProgress[record.questId]

            // Remote wins only if it is newer than local
            if (
              !local ||
              new Date(record.updatedAt).getTime() >
                new Date(local.updatedAt).getTime()
            ) {
              next[record.questId] = {
                outcome: record.outcome,
                reviewStep: record.reviewStep,
                reviewDueAt: record.reviewDueAt ?? undefined,
                updatedAt: record.updatedAt,
              }
            }
          })

          return next
        })
      })
      .catch(() => undefined)
  }, [session?.user])

  // When user is logged in and progress changes: sync full state to server
  useEffect(() => {
    if (!session?.user || Object.keys(progress).length === 0) {
      return
    }

    const signature = Object.entries(progress)
      .map(([id, p]) => `${id}:${p.outcome}:${p.reviewStep}`)
      .sort()
      .join('|')

    if (syncedProgressSignature.current === signature) {
      return
    }

    syncedProgressSignature.current = signature

    void syncDsaProgress(
      Object.fromEntries(
        Object.entries(progress).map(([questId, p]) => [
          questId,
          {
            outcome: p.outcome,
            reviewStep: p.reviewStep,
            reviewDueAt: p.reviewDueAt,
          },
        ]),
      ),
    ).catch(() => {
      syncedProgressSignature.current = ''
    })
  }, [progress, session?.user])

  const nextQuest = useMemo(() => getFirstIncompleteQuest(progress), [progress])
  const requestedQuest = activeQuestId ? dsaQuestById.get(activeQuestId) : undefined
  const focusQuest =
    requestedQuest && isQuestUnlocked(requestedQuest, progress)
      ? requestedQuest
      : nextQuest ?? dsaQuests[dsaQuests.length - 1]
  const focusProgress = progress[focusQuest.id]
  const focusUnlocked = isQuestUnlocked(focusQuest, progress)
  const totalProgressed = Object.keys(progress).length
  const solvedCount = Object.values(progress).filter(
    (item) => item.outcome === 'solved',
  ).length
  const guidedCount = Object.values(progress).filter(
    (item) => item.outcome === 'guided',
  ).length
  const reviewCount = Object.values(progress).filter(
    (item) => item.outcome === 'review',
  ).length
  const courseProgress = Math.round((totalProgressed / dsaQuests.length) * 100)
  const dueReviews = dsaQuests.filter((quest) => {
    const questProgress = progress[quest.id]

    return isReviewDue(questProgress?.reviewDueAt)
  })

  const setQuestOutcome = (questId: string, outcome: ProgressOutcome) => {
    setProgress((currentProgress) => ({
      ...currentProgress,
      [questId]: {
        outcome,
        reviewStep: 0,
        reviewDueAt: addDays(outcome === 'review' ? 0 : reviewIntervalsInDays[0]),
        updatedAt: new Date().toISOString(),
      },
    }))

    // Fire-and-forget: persist to backend if logged in
    if (session?.user) {
      void markDsaQuestOutcome(questId, outcome).catch(() => undefined)
    }
  }

  const markReviewComplete = (questId: string) => {
    setProgress((currentProgress) => {
      const currentQuestProgress = currentProgress[questId]

      if (!currentQuestProgress) {
        return currentProgress
      }

      const nextReviewStep = currentQuestProgress.reviewStep + 1
      const nextInterval = reviewIntervalsInDays[nextReviewStep]

      return {
        ...currentProgress,
        [questId]: {
          ...currentQuestProgress,
          reviewStep: nextReviewStep,
          reviewDueAt: nextInterval ? addDays(nextInterval) : undefined,
          updatedAt: new Date().toISOString(),
        },
      }
    })

    // Fire-and-forget: advance review step on backend if logged in
    if (session?.user) {
      void markDsaReviewComplete(questId).catch(() => undefined)
    }
  }

  const revealNextHint = (questId: string) => {
    setRevealedHints((currentHints) => ({
      ...currentHints,
      [questId]: Math.min((currentHints[questId] ?? 0) + 1, 3),
    }))
  }

  const focusHintCount = revealedHints[focusQuest.id] ?? 0
  const prerequisite = focusQuest.prerequisiteId
    ? dsaQuestById.get(focusQuest.prerequisiteId)
    : undefined

  return (
    <main className="dsa-course" id="dsa">
      <Wrap>
        <section className="dsa-hero" aria-labelledby="dsa-title">
          <NightSky className="night-sky--dsa" variant="dsa" />
          <div className="dsa-hero__copy">
            <a className="dsa-crumb" href="#top">
              Learning Atlas <span aria-hidden="true">/</span> DSA garden
            </a>
            <p className="dsa-kicker">A connected DSA course · JavaScript</p>
            <h1 id="dsa-title">
              One small win.
              <em>Then the next.</em>
            </h1>
            <p>
              A calm path through every essential pattern. You do not need to
              solve alone to move forward—you only need to learn honestly.
            </p>
            <div className="dsa-hero__actions">
              <button
                className="dsa-button dsa-button--primary"
                onClick={() => onNavigateQuest(nextQuest?.id ?? focusQuest.id)}
                type="button"
              >
                {totalProgressed ? 'Continue your path' : 'Begin with one small win'}
                <span aria-hidden="true">↓</span>
              </button>
              <a className="dsa-text-link" href="#dsa-map">
                See the whole map <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>

          <aside className="dsa-garden-card" aria-label="DSA course progress">
            <div className="dsa-garden-card__top">
              <div>
                <span>Your progress</span>
                <strong>{totalProgressed} of {dsaQuests.length}</strong>
              </div>
              <span className="dsa-garden-card__seed" aria-hidden="true">✦</span>
            </div>
            <div className="dsa-garden-meter" aria-label={`${courseProgress}% of course wrapped`}>
              <span style={{ width: `${courseProgress}%` }} />
            </div>
            <div className="dsa-garden-path" aria-hidden="true">
              {dsaSections.map((section, index) => {
                const quests = getDsaSectionQuests(section.id)
                const completed = quests.filter((quest) => progress[quest.id]).length

                return (
                  <div data-complete={completed === quests.length} key={section.id}>
                    <span>{index + 1}</span>
                    <p>{section.title}</p>
                    <small>{completed}/{quests.length}</small>
                  </div>
                )
              })}
            </div>
            <p className="dsa-garden-card__note">
              Progress is honest: supported answers count, then come back for a
              lighter review.
            </p>
          </aside>
        </section>

        <section className="dsa-principles" aria-label="How the course works">
          <div>
            <span>01</span>
            <p>Touch every important topic before going deep on any one.</p>
          </div>
          <div>
            <span>02</span>
            <p>Try for 15 minutes, then use a hint—never spend hours stuck.</p>
          </div>
          <div>
            <span>03</span>
            <p>Review the idea later, instead of pretending you will remember it.</p>
          </div>
        </section>

        <section className="dsa-focus" id="dsa-focus" aria-labelledby="focus-title">
          <div className="dsa-focus__rail">
            <span className="dsa-focus__number">{getSectionNumber(focusQuest.section)}</span>
            <p>{dsaSections[getSectionIndex(focusQuest.section)].eyebrow}</p>
            <span>{focusQuest.topic}</span>
          </div>

          <div className="dsa-focus__main">
            <div className="dsa-focus__heading">
              <div>
                <p className="dsa-kicker">Your next small win</p>
                <h2 id="focus-title">{focusQuest.title}</h2>
              </div>
              <div className="dsa-quest-meta" aria-label="Quest details">
                <span>{focusQuest.difficulty}</span>
                <span>{focusQuest.estimatedMinutes} min</span>
                <span>{focusQuest.source}</span>
              </div>
            </div>

            <p className="dsa-focus__connection">{focusQuest.connection}</p>

            <div className="dsa-pattern-card">
              <span>Pattern to notice</span>
              <strong>{focusQuest.pattern}</strong>
              <p>{focusQuest.whyItMatters}</p>
            </div>

            {prerequisite && (
              <div className="dsa-bridge-card">
                <span>Bridge from the previous quest</span>
                <p>
                  You already met <strong>{prerequisite.title}</strong>. Keep that
                  idea nearby; this quest is its next form.
                </p>
                <button onClick={() => onNavigateQuest(prerequisite.id)} type="button">
                  Revisit the bridge <span aria-hidden="true">↗</span>
                </button>
              </div>
            )}

            <div className="dsa-try-card">
              <div>
                <span>Before you code</span>
                <p>{focusQuest.tryFirst}</p>
              </div>
              {focusQuest.problemUrl ? (
                <a href={focusQuest.problemUrl} rel="noreferrer" target="_blank">
                  Open challenge <span aria-hidden="true">↗</span>
                </a>
              ) : (
                <details>
                  <summary>Open quest brief <span aria-hidden="true">↓</span></summary>
                  <OriginalQuestBrief quest={focusQuest} />
                </details>
              )}
            </div>

            <div className="dsa-hint-ladder">
              <div className="dsa-hint-ladder__header">
                <div>
                  <span>Stuck is a signal, not a failure</span>
                  <p>Use one hint at a time. Try again between each one.</p>
                </div>
                {focusHintCount < focusQuest.hints.length && (
                  <button onClick={() => revealNextHint(focusQuest.id)} type="button">
                    Reveal hint {focusHintCount + 1}
                  </button>
                )}
              </div>
              <ol>
                {focusQuest.hints.map((hint, index) => (
                  <li data-revealed={index < focusHintCount} key={hint}>
                    <span>{index + 1}</span>
                    <p>{index < focusHintCount ? hint : 'A gentle nudge is waiting here.'}</p>
                  </li>
                ))}
              </ol>
            </div>

            <aside className="dsa-interview-cue">
              <span>Say it in an interview</span>
              <p>“{focusQuest.interviewCue}”</p>
            </aside>

            <div className="dsa-outcome-panel">
              <div>
                <span>Wrap up honestly</span>
                <p>
                  {focusProgress
                    ? `Current note: ${outcomeLabel[focusProgress.outcome]}. You can update it whenever your understanding changes.`
                    : 'Choose the closest outcome. Every option keeps your path moving.'}
                </p>
              </div>
              <div className="dsa-outcome-actions">
                {(Object.keys(outcomeLabel) as ProgressOutcome[]).map((outcome) => (
                  <button
                    aria-pressed={focusProgress?.outcome === outcome}
                    className={`dsa-outcome-button dsa-outcome-button--${outcome}`}
                    key={outcome}
                    onClick={() => setQuestOutcome(focusQuest.id, outcome)}
                    type="button"
                  >
                    {outcomeLabel[outcome]}
                  </button>
                ))}
              </div>
              {!focusUnlocked && (
                <p className="dsa-locked-message">
                  Wrap up the earlier bridge first; then this quest will be ready.
                </p>
              )}
              {focusProgress && nextQuest && nextQuest.id !== focusQuest.id && (
                <button
                  className="dsa-next-quest"
                  onClick={() => onNavigateQuest(nextQuest.id)}
                  type="button"
                >
                  Continue to {nextQuest.title} <span aria-hidden="true">→</span>
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="dsa-review-section" aria-labelledby="review-title">
          <div>
            <p className="dsa-kicker">A kinder memory system</p>
            <h2 id="review-title">Your review shelf.</h2>
            <p>
              You do not need to re-solve everything. Revisit the pattern cue,
              explain the move, and do a small dry run.
            </p>
          </div>
          <div className="dsa-review-list">
            {dueReviews.length ? (
              dueReviews.slice(0, 3).map((quest) => {
                const questProgress = progress[quest.id]

                return (
                  <article key={quest.id}>
                    <div>
                      <span>{quest.topic}</span>
                      <h3>{quest.title}</h3>
                      <p>{quest.pattern}</p>
                    </div>
                    <div>
                      <button onClick={() => onNavigateQuest(quest.id)} type="button">
                        Open
                      </button>
                      <button onClick={() => markReviewComplete(quest.id)} type="button">
                        Reviewed
                      </button>
                    </div>
                    <small>
                      Review {Math.min(questProgress.reviewStep + 1, reviewIntervalsInDays.length)} of{' '}
                      {reviewIntervalsInDays.length}
                    </small>
                  </article>
                )
              })
            ) : totalProgressed ? (
              <div className="dsa-review-empty">
                <span aria-hidden="true">✦</span>
                <p>
                  Your shelf is clear for now. Your next gentle review will appear
                  on {formatShortDate(Object.values(progress).find((item) => item.reviewDueAt)?.reviewDueAt)}.
                </p>
              </div>
            ) : (
              <div className="dsa-review-empty">
                <span aria-hidden="true">☼</span>
                <p>Finish your first quest and its recall card will grow here.</p>
              </div>
            )}
          </div>
        </section>

        <section className="dsa-map" id="dsa-map" aria-labelledby="map-title">
          <div className="dsa-map__heading">
            <div>
              <p className="dsa-kicker">The course map</p>
              <h2 id="map-title">A path, not a pile.</h2>
            </div>
            <p>
              Each connection tells you why the next challenge exists. Nothing
              is added just to make the number bigger.
            </p>
          </div>

          <div className="dsa-section-list">
            {dsaSections.map((section) => {
              const sectionQuests = getDsaSectionQuests(section.id)
              const sectionUnlocked = isSectionUnlocked(section.id, progress)
              const completedCount = sectionQuests.filter((quest) => progress[quest.id]).length

              return (
                <article
                  className="dsa-section-card"
                  data-locked={!sectionUnlocked}
                  key={section.id}
                >
                  <header>
                    <div>
                      <span>{section.eyebrow}</span>
                      <h3>{section.title}</h3>
                    </div>
                    <div className="dsa-section-card__progress">
                      <strong>{sectionUnlocked ? `${completedCount}/${sectionQuests.length}` : 'Locked'}</strong>
                      <small>{section.promise}</small>
                    </div>
                  </header>
                  <p>{section.description}</p>
                  <ol>
                    {sectionQuests.map((quest, index) => {
                      const questUnlocked = isQuestUnlocked(quest, progress)
                      const questProgress = progress[quest.id]
                      const isActive = focusQuest.id === quest.id

                      return (
                        <li
                          data-active={isActive}
                          data-complete={Boolean(questProgress)}
                          data-locked={!questUnlocked}
                          key={quest.id}
                        >
                          <span className="dsa-map-quest__number">
                            {questProgress ? '✓' : String(index + 1).padStart(2, '0')}
                          </span>
                          <button
                            disabled={!questUnlocked}
                            onClick={() => onNavigateQuest(quest.id)}
                            type="button"
                          >
                            <strong>{quest.title}</strong>
                            <span>{quest.topic} · {quest.pattern}</span>
                          </button>
                          <em>{questUnlocked ? quest.difficulty : 'Complete the bridge first'}</em>
                        </li>
                      )
                    })}
                  </ol>
                </article>
              )
            })}
          </div>
        </section>

        <section className="dsa-progress-note" aria-label="Your course progress">
          <div>
            <span>Your notes</span>
            <p>
              {solvedCount} solved independently · {guidedCount} solved with support · {reviewCount} marked for review
            </p>
          </div>
          <button
            onClick={() => {
              window.localStorage.removeItem(progressStorageKey)
              setProgress({})
              onNavigateQuest(dsaQuests[0].id)
            }}
            type="button"
          >
            Reset only my DSA progress
          </button>
        </section>
      </Wrap>
    </main>
  )
}
