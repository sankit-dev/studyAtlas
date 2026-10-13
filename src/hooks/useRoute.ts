import { useSyncExternalStore } from 'react'
import { getLocationPath, subscribeToRoute } from '../lib/router'

export function useRoute() {
  return useSyncExternalStore(subscribeToRoute, getLocationPath, () => '/')
}
