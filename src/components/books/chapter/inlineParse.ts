// Inline syntax for chapter text: **bold**, *italic*, `code` and @you.

export type RunStyle = 'plain' | 'strong' | 'em' | 'code' | 'mention'
export type Run = { text: string; style: RunStyle }

const pattern = /\*\*(.+?)\*\*|`([^`]+)`|\*([^*]+)\*|(@you)\b/g

/** Splits **bold**, *italic*, `code` and @you out of a text field. */
export function parseInline(text: string): Run[] {
  const runs: Run[] = []
  let cursor = 0
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0
    if (index > cursor) runs.push({ text: text.slice(cursor, index), style: 'plain' })
    if (match[1] !== undefined) runs.push({ text: match[1], style: 'strong' })
    else if (match[2] !== undefined) runs.push({ text: match[2], style: 'code' })
    else if (match[3] !== undefined) runs.push({ text: match[3], style: 'em' })
    else runs.push({ text: match[4], style: 'mention' })
    cursor = index + match[0].length
  }
  if (cursor < text.length) runs.push({ text: text.slice(cursor), style: 'plain' })
  return runs
}

/** The text a reader sees, which is what highlight offsets count. */
export function plainText(text: string) {
  return parseInline(text)
    .map((run) => run.text)
    .join('')
}

