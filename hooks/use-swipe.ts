"use client"

import { useRef } from "react"

interface UseSwipeOptions {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  threshold?: number
}

/** Minimal horizontal-swipe detector for touch devices — no dependency. */
export function useSwipe({
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
}: UseSwipeOptions) {
  const startX = useRef<number | null>(null)

  function onTouchStart(event: React.TouchEvent) {
    startX.current = event.touches[0]?.clientX ?? null
  }

  function onTouchEnd(event: React.TouchEvent) {
    if (startX.current === null) return
    const endX = event.changedTouches[0]?.clientX ?? startX.current
    const delta = endX - startX.current
    if (delta > threshold) onSwipeRight?.()
    else if (delta < -threshold) onSwipeLeft?.()
    startX.current = null
  }

  return { onTouchStart, onTouchEnd }
}
