// Checks a chapter document before it is published. Mirrors the format in the
// web app (src/components/books/chapter/types.ts); keep the two in step.

type Kind = 'string' | 'number' | 'boolean' | 'array' | 'object'

// Required fields per block type. Optional fields are not checked here; the
// reader ignores anything it doesn't know.
const blockSpecs: Record<string, Record<string, Kind>> = {
  h2: { text: 'string' },
  h3: { text: 'string' },
  p: { text: 'string' },
  analogy: { text: 'string' },
  callout: { text: 'string' },
  slack: { channel: 'string', workspace: 'string', day: 'string', messages: 'array' },
  terminal: { title: 'string', lines: 'array' },
  code: { code: 'string' },
  notes: { items: 'array' },
  gate: {
    id: 'string',
    question: 'string',
    options: 'array',
    prompt: 'string',
    right: 'string',
    wrong: 'string',
    skipped: 'string',
  },
  diagram: { width: 'number', height: 'number', alt: 'string', shapes: 'array' },
  records: { title: 'string', source: 'string', columns: 'array', rows: 'array' },
  steps: { items: 'array' },
  waterfall: { intro: 'string', steps: 'array', scenarios: 'array', axisMs: 'number' },
  table: { columns: 'array', rows: 'array' },
  rule: { label: 'string', text: 'string' },
  question: { text: 'string' },
  answers: { items: 'array' },
  followups: { items: 'array' },
  flashcards: { cards: 'array' },
  deeper: { summary: 'string', sections: 'array' },
}

const shapeKinds = new Set(['rect', 'ellipse', 'arrow', 'line', 'text'])

function kindOf(value: unknown): Kind | 'other' {
  if (Array.isArray(value)) return 'array'
  if (value === null) return 'other'
  const type = typeof value
  return type === 'string' || type === 'number' || type === 'boolean' || type === 'object'
    ? type
    : 'other'
}

export type ValidChapter = {
  book: string
  number: number
  title: string
  blocks: { type: string }[]
  [key: string]: unknown
}

export function validateChapter(input: unknown): { ok: true; chapter: ValidChapter } | { ok: false; errors: string[] } {
  const errors: string[] = []
  if (kindOf(input) !== 'object') return { ok: false, errors: ['Chapter must be a JSON object'] }
  const doc = input as Record<string, unknown>

  if (typeof doc.book !== 'string' || !/^[a-z0-9-]+$/.test(doc.book)) {
    errors.push('book: a lowercase slug is required')
  }
  if (!Number.isInteger(doc.number) || (doc.number as number) < 1) {
    errors.push('number: a positive integer is required')
  }
  if (typeof doc.title !== 'string' || !doc.title.trim()) errors.push('title: required')
  if (!Array.isArray(doc.blocks) || doc.blocks.length === 0) {
    errors.push('blocks: at least one block is required')
    return { ok: false, errors }
  }

  let gates = 0
  doc.blocks.forEach((raw, index) => {
    const where = `blocks[${index}]`
    if (kindOf(raw) !== 'object') {
      errors.push(`${where}: must be an object`)
      return
    }
    const block = raw as Record<string, unknown>
    const spec = typeof block.type === 'string' ? blockSpecs[block.type] : undefined
    if (!spec) {
      errors.push(`${where}: unknown type ${JSON.stringify(block.type)}`)
      return
    }
    for (const [field, kind] of Object.entries(spec)) {
      if (kindOf(block[field]) !== kind) errors.push(`${where} (${block.type}).${field}: expected ${kind}`)
    }

    if (block.type === 'gate') {
      gates += 1
      const options = Array.isArray(block.options) ? block.options : []
      if (options.filter((option) => (option as { correct?: boolean }).correct).length !== 1) {
        errors.push(`${where} (gate): exactly one option needs "correct": true`)
      }
    }
    if (block.type === 'diagram' && Array.isArray(block.shapes)) {
      block.shapes.forEach((shape, i) => {
        const kind = (shape as { kind?: unknown })?.kind
        if (typeof kind !== 'string' || !shapeKinds.has(kind)) {
          errors.push(`${where} (diagram).shapes[${i}]: unknown kind ${JSON.stringify(kind)}`)
        }
      })
    }
    if (block.type === 'waterfall' && Array.isArray(block.steps) && Array.isArray(block.scenarios)) {
      const ids = new Set(block.steps.map((step) => (step as { id?: string }).id))
      block.scenarios.forEach((scenario, i) => {
        const fail = (scenario as { fail?: string }).fail
        if (fail !== undefined && !ids.has(fail)) {
          errors.push(`${where} (waterfall).scenarios[${i}].fail: no step "${fail}"`)
        }
      })
    }
  })

  if (gates > 1) errors.push('blocks: a chapter can have at most one gate')

  return errors.length > 0 ? { ok: false, errors } : { ok: true, chapter: doc as ValidChapter }
}

/** Rough word count, stored so the reader can estimate reading time. */
export function countWords(chapter: ValidChapter) {
  const strings: string[] = []
  const collect = (value: unknown) => {
    if (typeof value === 'string') strings.push(value)
    else if (Array.isArray(value)) value.forEach(collect)
    else if (value && typeof value === 'object') Object.values(value).forEach(collect)
  }
  chapter.blocks.forEach((block) => {
    if (block.type !== 'diagram' && block.type !== 'waterfall') collect(block)
  })
  return strings.join(' ').split(/\s+/).filter(Boolean).length
}
