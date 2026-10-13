// Placeholder text used to preview the reader while the books UI is built.
// Real chapters will be fetched from the API (never bundled), so this file is
// replaced by a `fetchChapter(slug, number)` call later.

export type ChapterBlock =
  | { type: 'h2'; text: string }
  | { type: 'p'; text: string }
  | { type: 'callout'; text: string }
  | { type: 'code'; text: string }

export const sampleBlocks: ChapterBlock[] = [
  {
    type: 'p',
    text: 'This is preview text for the reader. Chapters will load here once books are published, so treat the paragraphs below as a stand-in for real content.',
  },
  { type: 'h2', text: 'Why a reader, not a PDF' },
  {
    type: 'p',
    text: 'Long technical reading is easier when the page adapts to you. Pick a theme that is gentle on your eyes, set a comfortable text size and line width, and the reader remembers it next time.',
  },
  {
    type: 'p',
    text: 'Select any sentence to highlight it in one of four colours, attach a short note, or copy it. Highlights stay with the chapter, and the highlights panel collects them in one place so revision before an interview takes minutes.',
  },
  {
    type: 'callout',
    text: 'Tip: use the left and right arrow keys to move between chapters.',
  },
  { type: 'h2', text: 'Picking up where you left off' },
  {
    type: 'p',
    text: 'The reader tracks how far you are through each chapter. Open the books page and the continue strip takes you straight back to the right place, on any device once you are signed in.',
  },
  {
    type: 'code',
    text: 'const cached = await cache.get(key)\nif (cached) return cached\n\nconst fresh = await db.find(key)\nawait cache.set(key, fresh, { ttl: 300 })\nreturn fresh',
  },
  {
    type: 'p',
    text: 'Code blocks keep a monospaced face and never wrap, so long lines scroll sideways instead of breaking. Everything else follows your text settings.',
  },
  { type: 'h2', text: 'What comes next' },
  {
    type: 'p',
    text: 'Each chapter ends with links to the previous and next chapter. Free chapters are open to everyone; the rest unlock with a subscription that covers every current and future book.',
  },
  {
    type: 'p',
    text: 'That is the end of the preview. Scroll back up and try the controls in the top bar: contents, highlights and text settings.',
  },
]

export function countWords(blocks: ChapterBlock[]) {
  return blocks.reduce(
    (total, block) => total + block.text.split(/\s+/).filter(Boolean).length,
    0,
  )
}
