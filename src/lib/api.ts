export const apiOrigin =
  import.meta.env.VITE_API_ORIGIN ?? 'http://localhost:4000'

export function apiUrl(path: string) {
  return `${apiOrigin}${path}`
}

export function apiFetch(path: string, init: RequestInit = {}) {
  return fetch(apiUrl(path), {
    credentials: 'include',
    ...init,
  })
}

export async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T
}

export async function readOptionalJson<T>(response: Response): Promise<T | null> {
  return (await response.json().catch(() => null)) as T | null
}

export function jsonRequest(body: unknown, init: RequestInit = {}): RequestInit {
  return {
    ...init,
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  }
}
