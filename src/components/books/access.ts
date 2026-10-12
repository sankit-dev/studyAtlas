import { authClient } from '../../lib/auth'

export function signInWithGithub() {
  void authClient.signIn.social({
    provider: 'github',
    callbackURL: window.location.href,
    errorCallbackURL: window.location.href,
  })
}

/**
 * Whether the reader can open paid chapters. Subscriptions are not wired up
 * yet, so only free chapters open. This becomes a call to the entitlement API
 * (and the chapter API enforces it server-side regardless of what this says).
 */
export function useBookAccess() {
  const { data: session, isPending } = authClient.useSession()
  return {
    isPending,
    isSignedIn: Boolean(session?.user),
    isSubscribed: false,
  }
}
