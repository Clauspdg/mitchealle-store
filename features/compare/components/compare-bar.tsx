"use client"

import Link from "next/link"
import { XIcon } from "lucide-react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"

import { Button } from "@/components/ui/button"
import { useCompare } from "@/features/compare/context/compare-context"

export function CompareBar() {
  const { ids, remove, clear } = useCompare()
  const shouldReduceMotion = useReducedMotion()

  return (
    <AnimatePresence>
      {ids.length >= 2 ? (
        <motion.div
          initial={shouldReduceMotion ? false : { y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={shouldReduceMotion ? undefined : { y: 80, opacity: 0 }}
          transition={{
            duration: shouldReduceMotion ? 0 : 0.3,
            ease: "easeOut",
          }}
          className="bg-surface-ink text-surface-ink-foreground fixed inset-x-4 bottom-4 z-50 flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 shadow-xl sm:inset-x-auto sm:right-6 sm:left-6"
        >
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">
              {ids.length} produit{ids.length > 1 ? "s" : ""} à comparer
            </span>
            <button
              type="button"
              onClick={clear}
              className="text-surface-ink-foreground/60 hover:text-surface-ink-foreground text-xs underline underline-offset-4"
            >
              Tout effacer
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              render={<Link href={`/compare?ids=${ids.join(",")}`} />}
              nativeButton={false}
              size="sm"
              className="bg-accent-gold text-accent-gold-foreground hover:bg-accent-gold/90"
            >
              Comparer
            </Button>
            {ids.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => remove(id)}
                aria-label="Retirer du comparateur"
                className="text-surface-ink-foreground/60 hover:text-surface-ink-foreground"
              >
                <XIcon className="size-3.5" />
              </button>
            ))}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
