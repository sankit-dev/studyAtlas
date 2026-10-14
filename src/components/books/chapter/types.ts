// The chapter format. Chapters are written as JSON in the private content
// repo, checked by the publish script, stored in MongoDB and served by the API
// to readers who may open them. Nothing in this folder contains chapter text.
//
// Text fields accept a small inline syntax: **bold**, *italic*, `code` and
// @you (a chat mention). Nothing else is interpreted, so content can never
// inject markup.

export type Tone = 'ink' | 'text' | 'muted' | 'dim' | 'accent'

export type SlackMessage = {
  author: string
  time: string
  /** Marks the reader's own messages. */
  self?: boolean
  text: string
  error?: { title: string; detail: string }
}

export type TerminalLine = {
  text: string
  /** cmd lines get a "$" prompt and are what the copy button copies. */
  kind?: 'cmd' | 'out' | 'accent' | 'good' | 'dim'
}

export type GateOption = {
  key: string
  text: string
  why: string
  correct?: boolean
}

export type DiagramShape =
  | { kind: 'rect'; x: number; y: number; w: number; h: number; tone?: Tone; fill?: boolean; dashed?: boolean; seed?: number }
  | { kind: 'ellipse'; x: number; y: number; w: number; h: number; tone?: Tone; seed?: number }
  | { kind: 'arrow' | 'line'; from: [number, number]; to: [number, number]; tone?: Tone; width?: number; dashed?: boolean; seed?: number }
  | { kind: 'text'; x: number; y: number; text: string; tone?: Tone; size?: number; anchor?: 'start' | 'middle' | 'end' }

export type WaterfallStep = { id: string; name: string; ms: number }

export type WaterfallScenario = {
  id: string
  label: string
  /** The step that fails; omit when everything works. */
  fail?: string
  /** The failing step hangs instead of failing fast. */
  timeout?: string
  sees: string
  proof: string
  means: string
}

export type ChapterBlock =
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'p'; text: string; tone?: 'muted' }
  | { type: 'analogy'; text: string }
  | { type: 'callout'; text: string }
  | { type: 'slack'; channel: string; workspace: string; day: string; messages: SlackMessage[] }
  | { type: 'terminal'; title: string; subtitle?: string; lines: TerminalLine[] }
  | { type: 'code'; title?: string; lang?: string; code: string; highlight?: number[] }
  | { type: 'notes'; items: string[] }
  | { type: 'gate'; id: string; question: string; options: GateOption[]; prompt: string; right: string; wrong: string; skipped: string }
  | { type: 'diagram'; width: number; height: number; alt: string; caption?: string; shapes: DiagramShape[] }
  | { type: 'records'; title: string; source: string; columns: string[]; rows: (string | { from: string; to: string })[][] }
  | { type: 'steps'; items: { title: string; meta?: string; text: string }[] }
  | { type: 'waterfall'; intro: string; steps: WaterfallStep[]; scenarios: WaterfallScenario[]; initial?: string; axisMs: number }
  | { type: 'table'; columns: string[]; rows: string[][] }
  | { type: 'rule'; label: string; text: string }
  | { type: 'question'; text: string }
  | { type: 'answers'; items: { label: string; strong?: boolean; text?: string; list?: string[]; why?: string }[] }
  | { type: 'followups'; items: { summary: string; body: string[] }[] }
  | { type: 'flashcards'; cards: { q: string; a: string }[] }
  | { type: 'deeper'; summary: string; sections: { title: string; text: string }[] }

export type ChapterStatus = {
  items: { label: string; value: string }[]
  /** Shown until the chapter's gate is answered, then `after`. */
  before: { label: string; good?: boolean }
  after?: { label: string; good?: boolean }
}

export type ChapterDoc = {
  book: string
  number: number
  title: string
  eyebrow?: string
  lede?: string
  cast?: { name: string; role: string }[]
  status?: ChapterStatus
  blocks: ChapterBlock[]
  next?: { label: string; text: string }
}

export const blockTypes = [
  'h2',
  'h3',
  'p',
  'analogy',
  'callout',
  'slack',
  'terminal',
  'code',
  'notes',
  'gate',
  'diagram',
  'records',
  'steps',
  'waterfall',
  'table',
  'rule',
  'question',
  'answers',
  'followups',
  'flashcards',
  'deeper',
] as const satisfies readonly ChapterBlock['type'][]

/** Blocks whose text can be highlighted and noted. */
export function isHighlightable(block: ChapterBlock) {
  return (
    block.type === 'p' ||
    block.type === 'h3' ||
    block.type === 'analogy' ||
    block.type === 'callout'
  )
}
