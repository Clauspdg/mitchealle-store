"use client"

import { motion, useReducedMotion } from "framer-motion"

interface RevealProps {
  children: React.ReactNode
  className?: string
  delay?: number
}

/**
 * Thin `framer-motion` wrapper for one-time scroll-triggered reveals (hero
 * sections, catalog grid, PDP related-products) — respects the OS
 * "reduce motion" setting by skipping the animation entirely rather than
 * just shortening it.
 */
export function Reveal({ children, className, delay = 0 }: RevealProps) {
  const shouldReduceMotion = useReducedMotion()

  // Always render the same `motion.div` wrapper — conditionally swapping
  // between it and a bare `div` changes the tree shape at this position and
  // can trip "Rendered more hooks than during the previous render" if
  // `shouldReduceMotion` changes between renders of a mounted instance.
  // `initial={false}` is framer-motion's documented way to skip the enter
  // animation without changing what gets rendered.
  return (
    <motion.div
      className={className}
      initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={
        shouldReduceMotion
          ? { duration: 0 }
          : { duration: 0.5, delay, ease: "easeOut" }
      }
    >
      {children}
    </motion.div>
  )
}
