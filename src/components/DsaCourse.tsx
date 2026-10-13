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

const dsaKickerClassName =
  'm-0 mb-[15px] font-mono text-[11px] font-extrabold uppercase tracking-[0.1em] text-action'
const principleClassName =
  'grid grid-cols-[30px_minmax(0,1fr)] items-start gap-3.5 px-[22px] py-5 [&:not(:last-child)]:border-r [&:not(:last-child)]:border-divider max-[760px]:[&:not(:last-child)]:border-r-0 max-[760px]:[&:not(:last-child)]:border-b'
const principleNumberClassName =
  'font-mono text-[11px] font-black text-foreground'
const principleCopyClassName =
  'm-0 text-[13px] font-[650] leading-[1.55] text-secondary'
const dsaMicroLabelClassName =
  'font-mono text-[10px] font-extrabold uppercase tracking-[0.09em] text-secondary'
const dsaPillActionClassName =
  'inline-flex items-center gap-[7px] whitespace-nowrap rounded-full border border-[color-mix(in_srgb,var(--color-muted)_55%,var(--color-line))] text-xs font-[850] text-foreground'
const coursePrinciples = [
  'Touch every important topic before going deep on any one.',
  'Try for 15 minutes, then use a hint—never spend hours stuck.',
  'Review the idea later, instead of pretending you will remember it.',
] as const
const outcomeButtonClassName =
  'min-h-14 rounded-[10px] border border-divider bg-transparent text-xs font-[850] leading-[1.25] text-foreground transition-[background,border-color,color] hover:border-foreground aria-pressed:border-foreground motion-reduce:transition-none'
const outcomeStateClassName: Record<ProgressOutcome, string> = {
  solved:
    'hover:bg-[color-mix(in_srgb,var(--color-text)_42%,transparent)] aria-pressed:bg-[color-mix(in_srgb,var(--color-text)_42%,transparent)]',
  guided:
    'hover:bg-[color-mix(in_srgb,var(--color-soft-line)_82%,transparent)] aria-pressed:bg-[color-mix(in_srgb,var(--color-soft-line)_82%,transparent)]',
  review:
    'hover:bg-[color-mix(in_srgb,var(--color-text)_42%,transparent)] aria-pressed:bg-[color-mix(in_srgb,var(--color-text)_42%,transparent)]',
}
const reviewEmptyClassName =
  'flex min-h-[142px] items-center gap-4 rounded-[13px] border border-divider bg-[color-mix(in_srgb,var(--color-surface)_80%,transparent)] p-[22px]'
const reviewActionClassName =
  'whitespace-nowrap border-0 bg-transparent text-xs font-[850] text-foreground hover:text-action'

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
    <main className="overflow-hidden pb-[72px] max-[760px]:pb-[46px]" id="dsa">
      <Wrap>
        <section
          className="dsa-hero relative grid min-h-[552px] grid-cols-[minmax(0,1.12fr)_minmax(360px,0.88fr)] items-center gap-[clamp(48px,7vw,104px)] border-b border-divider py-16 pb-[60px] max-[980px]:grid-cols-1 max-[980px]:gap-[42px] max-[980px]:pt-[46px] max-[760px]:min-h-0 max-[760px]:py-[34px] max-[760px]:pb-[42px]"
          aria-labelledby="dsa-title"
        >
          <NightSky className="night-sky--dsa" variant="dsa" />
          <div className="relative z-[1]">
            <a
              className="mb-7 inline-flex items-center gap-2 font-mono text-[10px] font-extrabold uppercase tracking-[0.08em] text-secondary hover:text-action"
              href="#top"
            >
              Learning Atlas <span aria-hidden="true">/</span> DSA garden
            </a>
            <p className={dsaKickerClassName}>A connected DSA course · JavaScript</p>
            <h1
              className="m-0 max-w-[660px] text-[clamp(52px,6.2vw,86px)] font-[760] leading-[0.89] tracking-[-0.05em] max-[760px]:text-[clamp(46px,14vw,62px)]"
              id="dsa-title"
            >
              One small win.
              <em className="mt-2 block font-display text-[1.06em] font-normal tracking-[-0.035em] text-foreground">
                Then the next.
              </em>
            </h1>
            <p className="mt-[30px] mb-0 max-w-[570px] text-base leading-[1.8] text-secondary max-[760px]:mt-[22px] max-[760px]:text-sm">
              A calm path through every essential pattern. You do not need to
              solve alone to move forward—you only need to learn honestly.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-[22px] max-[760px]:mt-[25px] max-[760px]:gap-4">
              <button
                className="inline-flex items-center justify-center gap-4 rounded-full border border-transparent bg-inverse px-5 py-[15px] text-[13px] font-[850] text-on-inverse transition-[background,box-shadow,transform] duration-200 hover:shadow-[0_13px_22px_color-mix(in_srgb,var(--color-shadow)_70%,transparent)] motion-reduce:transition-none"
                onClick={() => onNavigateQuest(nextQuest?.id ?? focusQuest.id)}
                type="button"
              >
                {totalProgressed ? 'Continue your path' : 'Begin with one small win'}
                <span aria-hidden="true">↓</span>
              </button>
              <a className="text-[13px] font-extrabold text-foreground transition-colors hover:text-action motion-reduce:transition-none" href="#dsa-map">
                See the whole map <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>

          <aside
            className="dsa-garden-card relative z-[1] overflow-hidden rounded-[28px_28px_28px_8px] border border-[color-mix(in_srgb,var(--color-line)_88%,var(--color-text))] bg-[linear-gradient(148deg,color-mix(in_srgb,var(--color-surface)_82%,var(--color-soft-line)),var(--color-surface))] p-[30px] shadow-[18px_21px_0_color-mix(in_srgb,var(--color-shadow)_58%,transparent)] max-[980px]:w-[min(100%,570px)] max-[760px]:rounded-[20px_20px_20px_6px] max-[760px]:p-[21px] max-[760px]:shadow-[10px_12px_0_color-mix(in_srgb,var(--color-shadow)_55%,transparent)]"
            aria-label="DSA course progress"
          >
            <div className="flex items-start justify-between gap-[18px]">
              <div className="grid gap-2">
                <span className={dsaMicroLabelClassName}>Your progress</span>
                <strong className="text-[28px] tracking-[-0.05em]">{totalProgressed} of {dsaQuests.length}</strong>
              </div>
              <span
                className="grid size-[45px] rotate-[-12deg] place-items-center rounded-[50%_50%_45%_55%] bg-foreground text-xl text-canvas"
                aria-hidden="true"
              >
                ✦
              </span>
            </div>
            <div
              className="my-[25px] mt-7 h-2 overflow-hidden rounded-[99px] bg-[color-mix(in_srgb,var(--color-line)_74%,transparent)]"
              aria-label={`${courseProgress}% of course wrapped`}
            >
              <span
                className="block h-full rounded-[inherit] bg-foreground transition-[width] duration-300 motion-reduce:transition-none"
                style={{ width: `${courseProgress}%` }}
              />
            </div>
            <div className="relative z-[1] grid grid-cols-3 gap-[5px]" aria-hidden="true">
              {dsaSections.map((section, index) => {
                const quests = getDsaSectionQuests(section.id)
                const completed = quests.filter((quest) => progress[quest.id]).length

                return (
                  <div
                    className="grid min-w-0 gap-2 px-2 py-2.5 [&:not(:last-child)]:border-r [&:not(:last-child)]:border-dashed [&:not(:last-child)]:border-divider max-[760px]:px-[5px] max-[760px]:py-2"
                    data-complete={completed === quests.length}
                    key={section.id}
                  >
                    <span className="grid size-5 place-items-center rounded-full border border-divider font-mono text-[10px] text-secondary [[data-complete='true']_&]:border-foreground [[data-complete='true']_&]:bg-foreground [[data-complete='true']_&]:text-canvas">
                      {index + 1}
                    </span>
                    <p className="m-0 min-h-8 text-xs font-extrabold leading-[1.2] max-[760px]:text-[10px]">{section.title}</p>
                    <small className="m-0 font-mono text-[10px] text-secondary">{completed}/{quests.length}</small>
                  </div>
                )
              })}
            </div>
            <p className="relative z-[1] mt-[22px] mb-0 border-t border-[var(--color-soft-line)] pt-4 text-xs leading-[1.55] text-secondary">
              Progress is honest: supported answers count, then come back for a
              lighter review.
            </p>
          </aside>
        </section>

        <section
          className="my-10 mb-[70px] grid grid-cols-3 gap-0 rounded-2xl border border-divider bg-[color-mix(in_srgb,var(--color-surface)_72%,transparent)] max-[760px]:my-7 max-[760px]:mb-12 max-[760px]:grid-cols-1"
          aria-label="How the course works"
        >
          {coursePrinciples.map((principle, index) => (
            <div className={principleClassName} key={principle}>
              <span className={principleNumberClassName}>
                {String(index + 1).padStart(2, '0')}
              </span>
              <p className={principleCopyClassName}>{principle}</p>
            </div>
          ))}
        </section>

        <section
          className="grid grid-cols-[176px_minmax(0,1fr)] overflow-hidden rounded-[28px] border border-divider bg-panel shadow-[0_20px_50px_color-mix(in_srgb,var(--color-shadow)_32%,transparent)] mx-[-28px] max-[980px]:mx-0 max-[980px]:grid-cols-1 max-[760px]:rounded-[17px]"
          id="dsa-focus"
          aria-labelledby="focus-title"
        >
          <div className="dsa-focus__rail flex min-h-full flex-col justify-between border-r border-divider bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-soft-line)_68%,transparent),transparent_55%),color-mix(in_srgb,var(--color-surface)_92%,var(--color-soft-line))] px-6 py-7 max-[980px]:grid max-[980px]:min-h-0 max-[980px]:grid-cols-[auto_1fr_auto] max-[980px]:items-center max-[980px]:gap-3.5 max-[980px]:border-r-0 max-[980px]:border-b max-[980px]:px-6 max-[980px]:py-[18px] max-[760px]:grid-cols-[auto_minmax(0,1fr)] max-[760px]:px-[18px] max-[760px]:py-4">
            <span className="font-display text-[66px] leading-[0.85] text-foreground max-[980px]:text-[44px]">
              {getSectionNumber(focusQuest.section)}
            </span>
            <p className="mt-auto mb-[11px] font-mono text-[10px] font-extrabold uppercase leading-[1.55] tracking-[0.08em] text-secondary max-[980px]:m-0">
              {dsaSections[getSectionIndex(focusQuest.section)].eyebrow}
            </p>
            <span className="m-0 font-mono text-[10px] font-extrabold uppercase leading-[1.5] tracking-[0.08em] text-action max-[760px]:col-start-2">
              {focusQuest.topic}
            </span>
          </div>

          <div className="p-[clamp(28px,5vw,60px)] max-[760px]:px-[18px] max-[760px]:py-6">
            <div className="flex items-start justify-between gap-7 max-[760px]:flex-col">
              <div>
            <p className={dsaKickerClassName}>Your next small win</p>
                <h2
                  className="m-0 text-[clamp(34px,4.2vw,56px)] font-[760] leading-[0.98] tracking-[-0.045em] max-[760px]:text-4xl"
                  id="focus-title"
                >
                  {focusQuest.title}
                </h2>
              </div>
              <div className="flex max-w-[255px] flex-wrap justify-end gap-[7px] max-[760px]:max-w-none max-[760px]:justify-start" aria-label="Quest details">
                <span className="rounded-full border border-divider px-[9px] py-[7px] font-mono text-[10px] font-bold text-secondary">{focusQuest.difficulty}</span>
                <span className="rounded-full border border-divider px-[9px] py-[7px] font-mono text-[10px] font-bold text-secondary">{focusQuest.estimatedMinutes} min</span>
                <span className="rounded-full border border-divider px-[9px] py-[7px] font-mono text-[10px] font-bold text-secondary">{focusQuest.source}</span>
              </div>
            </div>

            <p className="my-[30px] mt-[23px] max-w-[700px] text-base leading-[1.75] text-secondary max-[760px]:my-[22px] max-[760px]:mt-[18px] max-[760px]:text-sm">
              {focusQuest.connection}
            </p>

            <div className="grid grid-cols-[152px_minmax(0,1fr)] gap-x-5 gap-y-[3px] border-y border-divider py-5 max-[760px]:grid-cols-1 max-[760px]:gap-[7px]">
              <span className={`${dsaMicroLabelClassName} row-span-2 pt-1 max-[760px]:row-auto`}>
                Pattern to notice
              </span>
              <strong className="text-[17px] tracking-[-0.02em]">{focusQuest.pattern}</strong>
              <p className="m-0 text-[13px] leading-[1.55] text-secondary">{focusQuest.whyItMatters}</p>
            </div>

            {prerequisite && (
              <div className="dsa-bridge-card mt-5 grid grid-cols-[152px_minmax(0,1fr)_auto] items-center gap-5 rounded-xl border border-[color-mix(in_srgb,var(--color-text)_38%,var(--color-line))] bg-[color-mix(in_srgb,var(--color-soft-line)_32%,var(--color-surface))] px-[18px] py-4 max-[980px]:grid-cols-[1fr_auto] max-[980px]:[&>span]:col-span-full max-[760px]:grid-cols-1 max-[760px]:gap-[11px] max-[760px]:[&>span]:col-auto">
                <span className={dsaMicroLabelClassName}>Bridge from the previous quest</span>
                <p className="m-0 text-[13px] leading-[1.55] text-secondary">
                  You already met <strong>{prerequisite.title}</strong>. Keep that
                  idea nearby; this quest is its next form.
                </p>
                <button
                  className="whitespace-nowrap border-0 bg-transparent text-xs font-[850] text-foreground hover:text-action max-[760px]:justify-self-start"
                  onClick={() => onNavigateQuest(prerequisite.id)}
                  type="button"
                >
                  Revisit the bridge <span aria-hidden="true">↗</span>
                </button>
              </div>
            )}

            <div className="dsa-try-card mt-5 flex items-center justify-between gap-6 rounded-xl bg-[color-mix(in_srgb,var(--color-text)_19%,var(--color-surface))] px-[18px] py-[17px] max-[760px]:flex-col max-[760px]:items-start max-[760px]:gap-[15px]">
              <div className="min-w-0">
                <span className={dsaMicroLabelClassName}>Before you code</span>
                <p className="mt-1.5 mb-0 text-[13px] leading-[1.55]">{focusQuest.tryFirst}</p>
              </div>
              {focusQuest.problemUrl ? (
                <a
                  className={`${dsaPillActionClassName} px-3 py-[9px] max-[760px]:self-stretch max-[760px]:justify-center`}
                  href={focusQuest.problemUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Open challenge <span aria-hidden="true">↗</span>
                </a>
              ) : (
                <details className="basis-[390px] max-[760px]:self-stretch max-[760px]:flex-auto [&_code]:rounded-sm [&_code]:bg-[color-mix(in_srgb,var(--color-text)_30%,transparent)] [&_code]:px-1 [&_code]:py-px [&_code]:font-mono [&_code]:text-[0.86em] [&_code]:text-foreground">
                  <summary className={`${dsaPillActionClassName} cursor-pointer justify-center px-3 py-[9px] [list-style:none] [&::-webkit-details-marker]:hidden`}>
                    Open quest brief <span aria-hidden="true">↓</span>
                  </summary>
                  <OriginalQuestBrief quest={focusQuest} />
                </details>
              )}
            </div>

            <div className="mt-8 border-t border-divider pt-[26px]">
              <div className="flex items-center justify-between gap-5 max-[760px]:flex-col max-[760px]:items-start">
                <div>
                  <span className={dsaMicroLabelClassName}>Stuck is a signal, not a failure</span>
                  <p className="mt-[5px] mb-0 text-[13px] text-secondary">Use one hint at a time. Try again between each one.</p>
                </div>
                {focusHintCount < focusQuest.hints.length && (
                  <button
                    className="shrink-0 rounded-full border border-divider bg-transparent px-[13px] py-2.5 text-xs font-[850] text-foreground transition-[border-color,background] hover:border-action hover:bg-[color-mix(in_srgb,var(--color-accent)_8%,transparent)] motion-reduce:transition-none"
                    onClick={() => revealNextHint(focusQuest.id)}
                    type="button"
                  >
                    Reveal hint {focusHintCount + 1}
                  </button>
                )}
              </div>
              <ol className="mt-[18px] mb-0 grid list-none grid-cols-3 gap-2.5 p-0 max-[760px]:grid-cols-1">
                {focusQuest.hints.map((hint, index) => (
                  <li
                    className={`min-h-28 rounded-[11px] border p-[15px] transition-[background,border-color] motion-reduce:transition-none max-[760px]:grid max-[760px]:min-h-0 max-[760px]:grid-cols-[20px_minmax(0,1fr)] max-[760px]:items-start max-[760px]:gap-3 ${
                      index < focusHintCount
                        ? 'border-solid border-[color-mix(in_srgb,var(--color-text)_46%,var(--color-line))] bg-[color-mix(in_srgb,var(--color-soft-line)_34%,var(--color-surface))] dark:bg-[color-mix(in_srgb,var(--color-soft-line)_62%,var(--color-surface))]'
                        : 'border-dashed border-divider bg-[color-mix(in_srgb,var(--color-surface)_68%,transparent)]'
                    }`}
                    data-revealed={index < focusHintCount}
                    key={hint}
                  >
                    <span className={`grid size-5 place-items-center rounded-full font-mono text-[10px] font-extrabold ${index < focusHintCount ? 'bg-foreground text-canvas' : 'bg-[color-mix(in_srgb,var(--color-line)_66%,transparent)] text-secondary'}`}>
                      {index + 1}
                    </span>
                    <p className={`mt-2.5 mb-0 text-xs leading-[1.52] max-[760px]:mt-px ${index < focusHintCount ? 'text-foreground' : 'text-secondary'}`}>
                      {index < focusHintCount ? hint : 'A gentle nudge is waiting here.'}
                    </p>
                  </li>
                ))}
              </ol>
            </div>

            <aside className="mt-[18px] border-l-[3px] border-foreground py-[7px] pl-[17px]">
              <span className={dsaMicroLabelClassName}>Say it in an interview</span>
              <p className="mt-[7px] mb-0 max-w-[720px] font-display text-xl leading-[1.25] text-foreground max-[760px]:text-lg">
                “{focusQuest.interviewCue}”
              </p>
            </aside>

            <div className="mt-9 grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] items-center gap-6 border-t border-divider pt-7 max-[760px]:flex max-[760px]:flex-col max-[760px]:items-start max-[760px]:gap-[17px]">
              <div>
                <span className={dsaMicroLabelClassName}>Wrap up honestly</span>
                <p className="mt-1.5 mb-0 text-[13px] leading-[1.55] text-secondary">
                  {focusProgress
                    ? `Current note: ${outcomeLabel[focusProgress.outcome]}. You can update it whenever your understanding changes.`
                    : 'Choose the closest outcome. Every option keeps your path moving.'}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 max-[760px]:w-full">
                {(Object.keys(outcomeLabel) as ProgressOutcome[]).map((outcome) => (
                  <button
                    aria-pressed={focusProgress?.outcome === outcome}
                    className={`${outcomeButtonClassName} ${outcomeStateClassName[outcome]}`}
                    key={outcome}
                    onClick={() => setQuestOutcome(focusQuest.id, outcome)}
                    type="button"
                  >
                    {outcomeLabel[outcome]}
                  </button>
                ))}
              </div>
              {!focusUnlocked && (
                <p className="col-span-full m-0 text-xs font-bold text-secondary">
                  Wrap up the earlier bridge first; then this quest will be ready.
                </p>
              )}
              {focusProgress && nextQuest && nextQuest.id !== focusQuest.id && (
                <button
                  className="col-span-full justify-self-end border-0 bg-transparent text-[13px] font-[850] text-action hover:text-foreground max-[760px]:self-stretch max-[760px]:text-left"
                  onClick={() => onNavigateQuest(nextQuest.id)}
                  type="button"
                >
                  Continue to {nextQuest.title} <span aria-hidden="true">→</span>
                </button>
              )}
            </div>
          </div>
        </section>

        <section
          className="mt-[92px] grid grid-cols-[minmax(0,0.73fr)_minmax(0,1.27fr)] items-center gap-[clamp(36px,6vw,90px)] border-y border-divider py-[65px] max-[760px]:mt-[58px] max-[760px]:grid-cols-1 max-[760px]:gap-7 max-[760px]:py-[45px]"
          aria-labelledby="review-title"
        >
          <div>
            <p className={dsaKickerClassName}>A kinder memory system</p>
            <h2 className="m-0 text-[clamp(34px,4.2vw,56px)] font-[760] leading-[0.98] tracking-[-0.045em] max-[760px]:text-4xl" id="review-title">Your review shelf.</h2>
            <p className="mt-5 mb-0 max-w-[360px] text-sm leading-[1.7] text-secondary max-[980px]:max-w-[560px]">
              You do not need to re-solve everything. Revisit the pattern cue,
              explain the move, and do a small dry run.
            </p>
          </div>
          <div className="grid gap-2.5">
            {dueReviews.length ? (
              dueReviews.slice(0, 3).map((quest) => {
                const questProgress = progress[quest.id]

                return (
                  <article className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-5 gap-y-3 rounded-[13px] border border-divider bg-[color-mix(in_srgb,var(--color-surface)_80%,transparent)] px-[18px] pt-[17px] pb-[13px]" key={quest.id}>
                    <div>
                      <span className="font-mono text-[10px] font-extrabold uppercase tracking-[0.07em] text-action">{quest.topic}</span>
                      <h3 className="mt-1.5 mb-0 text-base tracking-[-0.02em]">{quest.title}</h3>
                      <p className="mt-[3px] mb-0 text-xs text-secondary">{quest.pattern}</p>
                    </div>
                    <div className="flex gap-3">
                      <button className={reviewActionClassName} onClick={() => onNavigateQuest(quest.id)} type="button">
                        Open
                      </button>
                      <button className={`${reviewActionClassName} rounded-full border border-divider px-[9px] py-[7px]`} onClick={() => markReviewComplete(quest.id)} type="button">
                        Reviewed
                      </button>
                    </div>
                    <small className="col-span-full font-mono text-[10px] text-secondary">
                      Review {Math.min(questProgress.reviewStep + 1, reviewIntervalsInDays.length)} of{' '}
                      {reviewIntervalsInDays.length}
                    </small>
                  </article>
                )
              })
            ) : totalProgressed ? (
              <div className={reviewEmptyClassName}>
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--color-text)_38%,transparent)] text-action" aria-hidden="true">✦</span>
                <p className="m-0 max-w-[380px] text-[13px] leading-[1.55] text-secondary">
                  Your shelf is clear for now. Your next gentle review will appear
                  on {formatShortDate(Object.values(progress).find((item) => item.reviewDueAt)?.reviewDueAt)}.
                </p>
              </div>
            ) : (
              <div className={reviewEmptyClassName}>
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--color-text)_38%,transparent)] text-action" aria-hidden="true">☼</span>
                <p className="m-0 max-w-[380px] text-[13px] leading-[1.55] text-secondary">Finish your first quest and its recall card will grow here.</p>
              </div>
            )}
          </div>
        </section>

        <section className="mt-[84px] max-[760px]:mt-[57px]" id="dsa-map" aria-labelledby="map-title">
          <div className="mb-[34px] flex items-end justify-between gap-8 max-[760px]:mb-[25px] max-[760px]:flex-col max-[760px]:items-start max-[760px]:gap-4">
            <div>
              <p className={dsaKickerClassName}>The course map</p>
              <h2 className="m-0 text-[clamp(34px,4.2vw,56px)] font-[760] leading-[0.98] tracking-[-0.045em] max-[760px]:text-4xl" id="map-title">A path, not a pile.</h2>
            </div>
            <p className="m-0 max-w-[375px] text-sm leading-[1.65] text-secondary">
              Each connection tells you why the next challenge exists. Nothing
              is added just to make the number bigger.
            </p>
          </div>

          <div className="grid gap-[18px]">
            {dsaSections.map((section) => {
              const sectionQuests = getDsaSectionQuests(section.id)
              const sectionUnlocked = isSectionUnlocked(section.id, progress)
              const completedCount = sectionQuests.filter((quest) => progress[quest.id]).length

              return (
                <article
                  className={`overflow-hidden rounded-[18px] border border-divider bg-panel ${sectionUnlocked ? '' : 'opacity-65'}`}
                  data-locked={!sectionUnlocked}
                  key={section.id}
                >
                  <header className="flex items-center justify-between gap-5 border-b border-divider px-[26px] py-[23px] max-[760px]:items-start max-[760px]:px-[18px] max-[760px]:py-[19px]">
                    <div>
                      <span className="font-mono text-[10px] font-extrabold uppercase tracking-[0.09em] text-action">{section.eyebrow}</span>
                      <h3 className="mt-[7px] mb-0 text-[25px] tracking-[-0.035em] max-[760px]:text-[22px]">{section.title}</h3>
                    </div>
                    <div className="grid justify-items-end gap-[3px] text-right">
                      <strong className="font-mono text-sm">{sectionUnlocked ? `${completedCount}/${sectionQuests.length}` : 'Locked'}</strong>
                      <small className="text-[11px] text-secondary max-[760px]:hidden">{section.promise}</small>
                    </div>
                  </header>
                  <p className="m-0 max-w-[700px] px-[26px] py-[19px] text-[13px] leading-[1.6] text-secondary max-[760px]:px-[18px] max-[760px]:py-[15px]">{section.description}</p>
                  <ol className="m-0 grid list-none grid-cols-3 p-0 max-[760px]:grid-cols-1">
                    {sectionQuests.map((quest, index) => {
                      const questUnlocked = isQuestUnlocked(quest, progress)
                      const questProgress = progress[quest.id]
                      const isActive = focusQuest.id === quest.id

                      return (
                        <li
                          className={`relative grid min-h-[102px] grid-cols-[26px_minmax(0,1fr)] gap-2 border-t border-r border-[var(--color-soft-line)] p-[15px] [&:nth-child(3n)]:border-r-0 max-[760px]:min-h-[84px] max-[760px]:border-r-0 ${
                            !questUnlocked
                              ? 'bg-[color-mix(in_srgb,var(--color-page)_44%,transparent)]'
                              : isActive
                                ? 'bg-[color-mix(in_srgb,var(--color-soft-line)_33%,var(--color-surface))] dark:bg-[color-mix(in_srgb,var(--color-soft-line)_62%,var(--color-surface))]'
                                : ''
                          }`}
                          data-active={isActive}
                          data-complete={Boolean(questProgress)}
                          data-locked={!questUnlocked}
                          key={quest.id}
                        >
                          <span className={`grid size-[22px] place-items-center rounded-full border font-mono text-[9px] font-extrabold ${questProgress ? 'border-[color-mix(in_srgb,var(--color-text)_50%,var(--color-line))] bg-[color-mix(in_srgb,var(--color-text)_46%,transparent)] text-canvas' : 'border-divider text-secondary'}`}>
                            {questProgress ? '✓' : String(index + 1).padStart(2, '0')}
                          </span>
                          <button
                            className="min-w-0 border-0 bg-transparent p-0 text-left text-foreground disabled:cursor-not-allowed [&>span]:mt-[5px] [&>span]:block [&>span]:overflow-hidden [&>span]:text-[10px] [&>span]:leading-[1.4] [&>span]:text-secondary [&>span]:[-webkit-box-orient:vertical] [&>span]:[-webkit-line-clamp:2] [&>span]:[display:-webkit-box] hover:[&>strong]:text-action max-[760px]:[&>span]:[-webkit-line-clamp:1]"
                            disabled={!questUnlocked}
                            onClick={() => onNavigateQuest(quest.id)}
                            type="button"
                          >
                            <strong className="block text-[13px] leading-[1.3] transition-colors">{quest.title}</strong>
                            <span>{quest.topic} · {quest.pattern}</span>
                          </button>
                          <em className={`absolute right-[15px] bottom-3 max-w-[calc(100%-30px)] overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[9px] font-bold not-italic tracking-[0.02em] ${questUnlocked ? 'text-foreground' : 'text-secondary'}`}>
                            {questUnlocked ? quest.difficulty : 'Complete the bridge first'}
                          </em>
                        </li>
                      )
                    })}
                  </ol>
                </article>
              )
            })}
          </div>
        </section>

        <section className="mt-10 flex items-center justify-between gap-[22px] border-t border-divider pt-6 max-[760px]:mt-[26px] max-[760px]:flex-col max-[760px]:items-start" aria-label="Your course progress">
          <div className="grid gap-[7px]">
            <span className={dsaMicroLabelClassName}>Your notes</span>
            <p className="m-0 text-xs text-secondary">
              {solvedCount} solved independently · {guidedCount} solved with support · {reviewCount} marked for review
            </p>
          </div>
          <button
            className="border-0 bg-transparent text-[11px] font-bold text-secondary underline underline-offset-[3px] hover:text-action"
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
