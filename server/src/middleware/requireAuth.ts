import type { NextFunction, Request, Response } from 'express'
import { auth } from '../lib/auth.js'

export type AuthenticatedRequest = Request & {
  userId: string
}

function getRequestHeaders(request: Request) {
  const headers = new Headers()

  Object.entries(request.headers).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => headers.append(key, item))
      return
    }

    if (value !== undefined) {
      headers.set(key, value)
    }
  })

  return headers
}

/** The signed-in user's id, or null. For routes open to everyone. */
export async function getSessionUserId(request: Request) {
  const session = await auth.api.getSession({
    headers: getRequestHeaders(request),
  })
  return session?.user.id ?? null
}

export async function requireAuth(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  try {
    const session = await auth.api.getSession({
      headers: getRequestHeaders(request),
    })

    if (!session?.user.id) {
      response.status(401).json({ message: 'Authentication required' })
      return
    }

    ;(request as AuthenticatedRequest).userId = session.user.id
    next()
  } catch (error) {
    next(error)
  }
}
