import type { ChapterDoc } from './types'

/** Rough word count for the "minutes left" estimate. */
export function countChapterWords(doc: ChapterDoc) {
  const strings: string[] = []
  const collect = (value: unknown) => {
    if (typeof value === 'string') strings.push(value)
    else if (Array.isArray(value)) value.forEach(collect)
    else if (value && typeof value === 'object') Object.values(value).forEach(collect)
  }
  doc.blocks.forEach((block) => {
    if (block.type !== 'diagram' && block.type !== 'waterfall') collect(block)
  })
  return strings.join(' ').split(/\s+/).filter(Boolean).length
}
