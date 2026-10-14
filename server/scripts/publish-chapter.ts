// Publishes chapter JSON files from the private content repo to MongoDB.
//
//   npm run publish:chapter -- <file-or-folder> [more...] [--dry-run] [--free=1,4]
//
// Each file is checked first; nothing is written if any file fails. Chapters
// listed in --free (or with "free": true in the file) are open to everyone.
// Re-publishing a chapter replaces it and bumps its revision.

import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import mongoose from 'mongoose'
import { countWords, validateChapter, type ValidChapter } from '../src/books/validateChapter.js'
import { env } from '../src/config/env.js'
import { BookChapterModel } from '../src/models/BookChapter.js'

async function collectFiles(target: string): Promise<string[]> {
  const info = await stat(target)
  if (info.isFile()) return target.endsWith('.json') ? [target] : []
  const entries = await readdir(target)
  const nested = await Promise.all(entries.sort().map((entry) => collectFiles(path.join(target, entry))))
  return nested.flat()
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const freeArg = args.find((arg) => arg.startsWith('--free='))
  const freeNumbers = new Set(
    (freeArg?.slice('--free='.length) ?? '')
      .split(',')
      .map(Number)
      .filter((n) => Number.isInteger(n) && n > 0),
  )
  const targets = args.filter((arg) => !arg.startsWith('--'))
  if (targets.length === 0) {
    console.error('Usage: npm run publish:chapter -- <file-or-folder> [--dry-run] [--free=1,4]')
    process.exit(1)
  }

  const files = (await Promise.all(targets.map(collectFiles))).flat()
  const ready: { file: string; chapter: ValidChapter; free: boolean }[] = []
  let failed = false

  for (const file of files) {
    let parsed: unknown
    try {
      parsed = JSON.parse(await readFile(file, 'utf8'))
    } catch (error) {
      console.error(`✗ ${file}: not valid JSON (${(error as Error).message})`)
      failed = true
      continue
    }
    const result = validateChapter(parsed)
    if (!result.ok) {
      console.error(`✗ ${file}`)
      result.errors.forEach((message) => console.error(`    ${message}`))
      failed = true
      continue
    }
    const { chapter } = result
    const free = chapter.free === true || freeNumbers.has(chapter.number)
    ready.push({ file, chapter, free })
    console.log(`✓ ${file} → ${chapter.book} #${chapter.number} "${chapter.title}"${free ? ' (free)' : ''}, ${countWords(chapter)} words`)
  }

  if (failed) {
    console.error('\nNothing published. Fix the errors above and run again.')
    process.exit(1)
  }
  if (ready.length === 0) {
    console.error('No .json chapter files found.')
    process.exit(1)
  }
  if (dryRun) {
    console.log(`\nDry run: ${ready.length} chapter(s) valid, nothing written.`)
    return
  }
  if (!env.mongodbUri) {
    console.error('MONGODB_URI is not set (server/.env).')
    process.exit(1)
  }

  await mongoose.connect(env.mongodbUri)
  try {
    for (const { chapter, free } of ready) {
      // The stored document never carries the publishing flag.
      const { free: _ignored, ...content } = chapter
      void _ignored
      const saved = await BookChapterModel.findOneAndUpdate(
        { bookSlug: chapter.book, number: chapter.number },
        {
          $set: {
            title: chapter.title,
            free,
            content,
            words: countWords(chapter),
            publishedAt: new Date(),
          },
          $inc: { revision: 1 },
        },
        { upsert: true, new: true, setDefaultsOnInsert: false },
      ).lean()
      console.log(`Published ${chapter.book} #${chapter.number} (revision ${saved?.revision ?? 1})`)
    }
  } finally {
    await mongoose.disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
