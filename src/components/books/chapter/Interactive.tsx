import { useState } from 'react'
import { Inline } from './inline'
import type { ChapterBlock } from './types'

type GateBlock = Extract<ChapterBlock, { type: 'gate' }>

/**
 * A question to answer before reading on. `answer` is the chosen key, 'skip',
 * or null while unanswered; the parent keeps it so it can unlock what follows.
 */
export function Gate({
  block,
  answer,
  onAnswer,
}: {
  block: GateBlock
  answer: string | null
  onAnswer: (key: string) => void
}) {
  const correct = block.options.find((option) => option.correct)?.key
  const message =
    answer === null
      ? block.prompt
      : answer === 'skip'
        ? block.skipped
        : answer === correct
          ? block.right
          : block.wrong

  return (
    <div className="bk-ch-gate">
      <p className="bk-ch-gate__q">
        <Inline text={block.question} />
      </p>
      <div aria-label="Choose an answer" className="bk-ch-gate__opts" role="group">
        {block.options.map((option) => {
          const result =
            answer === null
              ? undefined
              : option.key === correct
                ? 'right'
                : option.key === answer
                  ? 'wrong'
                  : undefined
          const showWhy = answer !== null && (option.key === correct || option.key === answer)
          return (
            <button
              className="bk-ch-opt"
              data-result={result}
              disabled={answer !== null}
              key={option.key}
              onClick={() => onAnswer(option.key)}
              type="button"
            >
              <span className="bk-ch-opt__k">{option.key.toUpperCase()}</span>
              <span>
                <Inline text={option.text} />
                {showWhy && (
                  <span className="bk-ch-opt__why">
                    <Inline text={option.why} />
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>
      <div className="bk-ch-gate__foot">
        <span role="status">{message}</span>
        {answer === null && (
          <button className="bk-ch-link" onClick={() => onAnswer('skip')} type="button">
            Skip, just show me
          </button>
        )}
      </div>
    </div>
  )
}

type WaterfallBlock = Extract<ChapterBlock, { type: 'waterfall' }>

/** Places each step's bar on the time axis, stopping at the failing step. */
function layoutWaterfall(
  steps: WaterfallBlock['steps'],
  scenario: WaterfallBlock['scenarios'][number],
  max: number,
) {
  const rows: { id: string; name: string; state: 'ok' | 'fail' | 'skip'; left: number; width: number; label: string }[] = []
  let elapsed = 0
  let stopped = false
  let total = ''
  for (const step of steps) {
    const left = (elapsed / max) * 100
    if (stopped) {
      rows.push({ id: step.id, name: step.name, state: 'skip', left, width: 0, label: '·' })
      continue
    }
    const failed = scenario.fail === step.id
    stopped = failed
    if (failed && scenario.timeout) {
      total = `${scenario.timeout} of waiting`
      rows.push({ id: step.id, name: step.name, state: 'fail', left, width: 100 - left, label: scenario.timeout })
      continue
    }
    elapsed += step.ms
    total = `${elapsed} ms`
    rows.push({
      id: step.id,
      name: step.name,
      state: failed ? 'fail' : 'ok',
      left,
      width: Math.max((step.ms / max) * 100, 1.5),
      label: `${failed ? '✕ ' : ''}${step.ms} ms`,
    })
  }
  return { rows, total }
}

export function Waterfall({ block }: { block: Extract<ChapterBlock, { type: 'waterfall' }> }) {
  const [selectedId, setSelectedId] = useState(block.initial ?? block.scenarios[0]?.id)
  const scenario = block.scenarios.find((item) => item.id === selectedId) ?? block.scenarios[0]
  if (!scenario) return null
  const max = block.axisMs

  const { rows, total } = layoutWaterfall(block.steps, scenario, max)

  return (
    <div className="bk-ch-sandbox">
      <p className="bk-ch-sandbox__intro">
        <Inline text={block.intro} />
      </p>
      <div aria-label="Choose a scenario" className="bk-ch-seg" role="group">
        {block.scenarios.map((item) => (
          <button
            aria-pressed={item.id === scenario.id}
            key={item.id}
            onClick={() => setSelectedId(item.id)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="bk-ch-wf">
        {rows.map((row) => (
          <div className="bk-ch-wf__row" data-s={row.state} key={row.id}>
            <span className="bk-ch-wf__name">{row.name}</span>
            <div className="bk-ch-wf__track">
              <div className="bk-ch-wf__bar" style={{ left: `${row.left}%`, width: `${row.width}%` }} />
            </div>
            <span className="bk-ch-wf__ms">{row.label}</span>
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="bk-ch-wf__axis">
        <span />
        <div>
          <span>0 ms</span>
          <span>{Math.round(max / 2)}</span>
          <span>{max} ms</span>
        </div>
        <span />
      </div>
      <dl className="bk-ch-result">
        <div>
          <dt>{scenario.fail ? 'Stops after' : 'Total'}</dt>
          <dd className="bk-ch-result__total">{total}</dd>
        </div>
        <div>
          <dt>User sees</dt>
          <dd>{scenario.sees}</dd>
        </div>
        <div>
          <dt>curl -v shows</dt>
          <dd>
            <code>{scenario.proof}</code>
          </dd>
        </div>
        <div>
          <dt>What it means</dt>
          <dd>
            <Inline text={scenario.means} />
          </dd>
        </div>
      </dl>
    </div>
  )
}

export function Flashcards({ block }: { block: Extract<ChapterBlock, { type: 'flashcards' }> }) {
  const [flipped, setFlipped] = useState<Set<number>>(() => new Set())

  return (
    <div aria-label="Flashcards. Select a card to flip it." className="bk-ch-cards" role="group">
      {block.cards.map((card, index) => {
        const isFlipped = flipped.has(index)
        return (
          <button
            aria-label={`Flashcard. ${isFlipped ? `Answer: ${card.a}` : `Question: ${card.q}`}`}
            className="bk-ch-card"
            data-flipped={isFlipped}
            key={index}
            onClick={() =>
              setFlipped((current) => {
                const next = new Set(current)
                if (next.has(index)) next.delete(index)
                else next.add(index)
                return next
              })
            }
            type="button"
          >
            <span className="bk-ch-card__face">{isFlipped ? card.a : card.q}</span>
            <span className="bk-ch-card__hint">{isFlipped ? 'Tap for the question' : 'Tap to reveal'}</span>
          </button>
        )
      })}
    </div>
  )
}
