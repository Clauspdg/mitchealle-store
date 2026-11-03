"use client"

import Link from "next/link"
import { XIcon } from "lucide-react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"

import { Button } from "@/components/ui/button"
import { useCompare } from "@/features/compare/context/compare-context"
import { useI18n } from "@/i18n/client"

export function CompareBar() {
  const { t, plural } = useI18n()
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
          className="bg-surface-ink text-surface-ink-foreground fixed inset-x-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 shadow-xl sm:inset-x-auto sm:right-6 sm:left-6 md:bottom-4"
        >
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">
              {plural("catalog.compare.count", ids.length)}
            </span>
            <button
              type="button"
              onClick={clear}
              className="text-surface-ink-foreground/60 hover:text-surface-ink-foreground text-xs underline underline-offset-4"
            >
              {t("catalog.compare.clear")}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              render={<Link href={`/compare?ids=${ids.join(",")}`} />}
              nativeButton={false}
              size="sm"
              className="bg-accent-gold text-accent-gold-foreground hover:bg-accent-gold/90"
            >
              {t("catalog.compare.compare")}
            </Button>
            {ids.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => remove(id)}
                aria-label={t("catalog.compare.remove")}
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
