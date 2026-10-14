// Book catalogue metadata only. Chapter text never lives in this repo: it is
// served by the API to entitled readers (see the books plan). Keep this file to
// titles, ordering and which chapters are free.

export type BookCategory = 'backend' | 'system-design' | 'ai'

export type BookChapter = {
  number: number
  title: string
  free: boolean
}

export type BookPart = {
  title: string
  chapters: BookChapter[]
}

export type Book = {
  slug: string
  title: string
  description: string
  category: BookCategory
  cover: 'dark' | 'light'
  updated: string
  parts: BookPart[]
}

export const bookCategories: { id: BookCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'backend', label: 'Backend' },
  { id: 'system-design', label: 'System design' },
  { id: 'ai', label: 'AI' },
]

type PartInput = [title: string, chapters: string[]]

function buildParts(parts: PartInput[], free: number[]): BookPart[] {
  let number = 0
  return parts.map(([title, chapters]) => ({
    title,
    chapters: chapters.map((chapterTitle) => {
      number += 1
      return { number, title: chapterTitle, free: free.includes(number) }
    }),
  }))
}

export const books: Book[] = [
  {
    slug: 'how-the-backend-works',
    title: 'How the Backend Works',
    description:
      'Your first year as a backend engineer, one production incident at a time. For freshers and 0–1 years.',
    category: 'backend',
    cover: 'dark',
    updated: 'Oct 2026',
    parts: buildParts(
      [
        ['Act I · Surviving launch week', ['The Blank Screen', 'Mobile API Chaos', 'Corrupted JSON File']],
        [
          'Act II · The first traffic spike',
          ['The 9-Second Page', 'Double-Booked Front Row', 'The Stolen Session'],
        ],
        [
          'Act III · Going viral',
          ['Comedian Tweet Meltdown', '12-Second Checkout', 'Single Server Ceiling'],
        ],
        [
          'Act IV · Production and the payoff',
          ['The 2 AM Mystery', 'The Waitlist Feature', 'Interview Week'],
        ],
      ],
      [1],
    ),
  },
  {
    slug: 'system-design-interview-handbook',
    title: 'System Design Interview Handbook',
    description: 'Fundamentals, a 45-minute method and nine worked designs.',
    category: 'system-design',
    cover: 'dark',
    updated: 'Oct 2026',
    parts: buildParts(
      [
        [
          'Targeting',
          [
            'The remote market',
            'Choosing your target role',
            'How remote startup interviews run',
          ],
        ],
        [
          'Fundamentals',
          [
            'How a request travels',
            'APIs and communication',
            'Databases',
            'Scaling the database',
            'Caching',
            'Scaling the application tier',
            'Queues and async processing',
            'Distributed systems essentials',
            'Reliability and resilience',
            'Security and auth',
            'Observability and deployment',
            'Back-of-the-envelope estimation',
          ],
        ],
        ['The method', ['The 45-minute framework']],
        [
          'Worked designs',
          [
            'URL shortener',
            'Rate limiter',
            'Chat application',
            'News feed',
            'Notification system',
            'File upload and storage',
            'Search autocomplete',
            'Ticket booking',
            'Job scheduler',
          ],
        ],
        [
          'AI system design',
          [
            'LLMs as a system component',
            'Design a RAG assistant',
            'Shipping AI features safely',
          ],
        ],
        [
          'Other rounds',
          [
            'Coding rounds and DSA patterns',
            'Low-level design',
            'JavaScript, Node and React depth',
            'Project deep-dive and behavioral',
          ],
        ],
        ['The plan', ['The 8-week plan', '100 rapid-fire questions']],
      ],
      [1, 4, 17],
    ),
  },
  {
    slug: 'ai-engineering-field-guide',
    title: 'AI Engineering Field Guide',
    description:
      'How modern AI works, how to build with it, and the roles worth targeting.',
    category: 'ai',
    cover: 'light',
    updated: 'Oct 2026',
    parts: buildParts(
      [
        [
          'The story',
          [
            'What you already know',
            'Before LLMs',
            'The LLM era, 2017–2026',
            'What changed for software engineers',
          ],
        ],
        [
          'How it works',
          [
            'The math you actually need',
            'Embeddings',
            'Inside the transformer',
            'Training at scale',
            'Post-training: from text predictor to assistant',
            'Inference engineering',
          ],
        ],
        [
          'Building with AI',
          [
            'The AI engineering stack',
            'Context engineering',
            'Retrieval beyond the basics',
            'Agents in depth',
            'Orchestration and multi-agent systems',
            'MCP, A2A and agent protocols',
          ],
        ],
        [
          'Production',
          [
            'Multimodal AI',
            'Customizing models',
            'Evals in depth',
            'AI security',
            'LLMOps and cost',
          ],
        ],
        [
          'Careers',
          [
            'The AI job map',
            'Your realistic targets',
            'AI interview questions',
          ],
        ],
        [
          'Learning',
          ['How to learn AI', 'Projects', 'The 12-week roadmap', 'Glossary'],
        ],
      ],
      [1, 6, 11],
    ),
  },
]

export function getBook(slug: string) {
  return books.find((book) => book.slug === slug)
}

export function getChapters(book: Book) {
  return book.parts.flatMap((part) => part.chapters)
}

export function getChapterCount(book: Book) {
  return getChapters(book).length
}

export function getFreeChapterCount(book: Book) {
  return getChapters(book).filter((chapter) => chapter.free).length
}

export function getChapter(book: Book, number: number) {
  return getChapters(book).find((chapter) => chapter.number === number)
}

export function bookPath(book: Book) {
  return `/books/${book.slug}`
}

export function chapterPath(book: Book, number: number) {
  return `/books/${book.slug}/read/${number}`
}
