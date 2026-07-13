import { useSyncExternalStore } from "react"

const subscribe = () => () => {}

/**
 * True only after the client has hydrated. Useful to defer rendering of
 * anything that depends on browser-only state (e.g. resolved theme) without
 * a server/client markup mismatch. Implemented via `useSyncExternalStore`
 * instead of `useState` + `useEffect` so it doesn't trigger the
 * "no setState synchronously in an effect" lint rule.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  )
}
