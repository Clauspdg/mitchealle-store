"use client"

import { useEffect } from "react"

/**
 * Registers the (currently no-op) service worker in production only —
 * during development it would fight Turbopack's own hot-reload/caching.
 * See public/sw.js for why there's no offline strategy yet.
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Non-critical: installability degrades gracefully without it.
      })
    }
  }, [])

  return null
}
