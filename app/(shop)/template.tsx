"use client"

import { motion, useReducedMotion } from "framer-motion"

/** Simple mount fade-in for storefront route transitions — no
 * `AnimatePresence` route-exit tricks, which is riskier with RSC boundaries. */
export default function ShopTemplate({
  children,
}: {
  children: React.ReactNode
}) {
  const shouldReduceMotion = useReducedMotion()

  // Always render the same `motion.div` wrapper — conditionally swapping
  // between it and bare `children` changes the tree shape at this position
  // and can trip "Rendered more hooks than during the previous render" on
  // route transitions. `initial={false}` is framer-motion's documented way
  // to skip the enter animation without changing what gets rendered.
  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.35 }}
    >
      {children}
    </motion.div>
  )
}
