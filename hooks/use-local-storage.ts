"use client"

import { useEffect, useState } from "react"

import { useMounted } from "@/hooks/use-mounted"

/**
 * Like `useState`, but persisted to `localStorage`. The first render always
 * returns `initialValue` (avoids a server/client markup mismatch); once
 * mounted, it synchronously adopts whatever was stored — this "adjust
 * state during render" step runs in the render body (not an effect), which
 * is the React-endorsed way to do a one-time hydration read without
 * tripping the "no setState in an effect" rule.
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const mounted = useMounted()
  const [value, setValue] = useState<T>(initialValue)
  const [hydrated, setHydrated] = useState(false)

  if (mounted && !hydrated) {
    setHydrated(true)
    try {
      const stored = window.localStorage.getItem(key)
      if (stored !== null) setValue(JSON.parse(stored) as T)
    } catch {
      // Malformed or inaccessible storage — keep the initial value.
    }
  }

  useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Storage full/unavailable — non-critical, state still works in-memory.
    }
  }, [key, value, hydrated])

  return [value, setValue] as const
}
