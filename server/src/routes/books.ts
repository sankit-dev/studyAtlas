import { Router, type Request } from 'express'
import { getSessionUserId } from '../middleware/requireAuth.js'
import { rateLimit } from '../middleware/rateLimit.js'
import { BookChapterModel } from '../models/BookChapter.js'
import { hasActiveSubscription } from '../models/Subscription.js'

export const booksRouter = Router()

const slugPattern = /^[a-z0-9-]{1,120}$/

booksRouter.use(
  rateLimit({
    keyPrefix: 'books',
    limit: 60,
    windowMs: 60_000,
  }),
)

/** Whether the signed-in reader can open paid chapters. */
booksRouter.get('/access', async (request: Request, response, next) => {
  try {
    response.set('Cache-Control', 'private, no-store')
    const userId = await getSessionUserId(request)
    response.json({
      signedIn: Boolean(userId),
      subscribed: userId ? await hasActiveSubscription(userId) : false,
    })
  } catch (error) {
    next(error)
  }
})

/**
 * One chapter. Free chapters are open to everyone; paid chapters need a
 * signed-in reader with an active subscription. 401 means "sign in", 403
 * means "subscribe". Content is never cached by shared caches.
 */
booksRouter.get('/:slug/chapters/:number', async (request, response, next) => {
  try {
    response.set('Cache-Control', 'private, no-store')
    const slug = String(request.params.slug)
    const number = Number(request.params.number)
    if (!slugPattern.test(slug) || !Number.isInteger(number) || number < 1 || number > 500) {
      response.status(404).json({ message: 'Chapter not found' })
      return
    }

    const meta = await BookChapterModel.findOne({ bookSlug: slug, number })
      .select('free')
      .lean()
    if (!meta) {
      response.status(404).json({ message: 'Chapter not found' })
      return
    }

    if (!meta.free) {
      const userId = await getSessionUserId(request)
      if (!userId) {
        response.status(401).json({ message: 'Sign in to read this chapter' })
        return
      }
      if (!(await hasActiveSubscription(userId))) {
        response.status(403).json({ message: 'Subscribe to read this chapter' })
        return
      }
    }

    const chapter = await BookChapterModel.findOne({ bookSlug: slug, number })
      .select('content words revision publishedAt')
      .lean()
    if (!chapter) {
      response.status(404).json({ message: 'Chapter not found' })
      return
    }

    response.json({
      chapter: chapter.content,
      words: chapter.words,
      revision: chapter.revision,
      publishedAt: chapter.publishedAt,
    })
  } catch (error) {
    next(error)
  }
})
