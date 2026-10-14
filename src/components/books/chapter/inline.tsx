import type { ReactNode } from 'react'
import type { Highlight } from '../storage'
import { parseInline, type RunStyle } from './inlineParse'

function wrap(style: RunStyle, children: ReactNode, key: string) {
  if (style === 'strong') return <strong key={key}>{children}</strong>
  if (style === 'em') return <em key={key}>{children}</em>
  if (style === 'code') return <code key={key}>{children}</code>
  if (style === 'mention') return <span className="bk-ch-mention" key={key}>{children}</span>
  return <span key={key}>{children}</span>
}

type MarkClick = (id: string, rect: DOMRect) => void

/**
 * Renders inline text, cutting runs wherever a highlight starts or ends so a
 * highlight can cover bold or code inside a sentence.
 */
export function Inline({
  text,
  marks = [],
  onMarkClick,
}: {
  text: string
  marks?: Highlight[]
  onMarkClick?: MarkClick
}) {
  const runs = parseInline(text)
  if (marks.length === 0) {
    return <>{runs.map((run, i) => (run.style === 'plain' ? run.text : wrap(run.style, run.text, String(i))))}</>
  }

  const total = runs.reduce((sum, run) => sum + run.text.length, 0)
  const valid = marks.filter((mark) => mark.start >= 0 && mark.end <= total && mark.start < mark.end)
  const nodes: ReactNode[] = []
  let offset = 0

  runs.forEach((run, runIndex) => {
    const runStart = offset
    const runEnd = offset + run.text.length
    offset = runEnd

    const cuts = new Set([runStart, runEnd])
    for (const mark of valid) {
      if (mark.start > runStart && mark.start < runEnd) cuts.add(mark.start)
      if (mark.end > runStart && mark.end < runEnd) cuts.add(mark.end)
    }
    const points = [...cuts].sort((a, b) => a - b)

    for (let i = 0; i < points.length - 1; i += 1) {
      const from = points[i]
      const to = points[i + 1]
      const piece = run.text.slice(from - runStart, to - runStart)
      const key = `${runIndex}-${from}`
      const content = run.style === 'plain' ? piece : wrap(run.style, piece, `${key}-s`)
      const mark = valid.find((item) => item.start <= from && item.end >= to)
      if (!mark) {
        nodes.push(run.style === 'plain' ? piece : content)
        continue
      }
      nodes.push(
        <mark
          className="bk-mark"
          data-color={mark.color}
          data-hl={mark.id}
          data-note={mark.note || undefined}
          key={key}
          onClick={(event) => onMarkClick?.(mark.id, event.currentTarget.getBoundingClientRect())}
          tabIndex={mark.note ? 0 : undefined}
        >
          {content}
        </mark>,
      )
    }
  })

  return <>{nodes}</>
}
