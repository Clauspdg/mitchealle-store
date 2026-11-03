"use client"

import Link from "next/link"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { ShoppingBagIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useCartItemCount } from "@/features/cart/hooks/use-cart-item-count"
import { useI18n } from "@/i18n/client"

export function CartBadge() {
  const { t, plural } = useI18n()
  const count = useCartItemCount()
  const shouldReduceMotion = useReducedMotion()

  return (
    <Button
      render={<Link href="/cart" />}
      nativeButton={false}
      variant="ghost"
      size="icon"
      aria-label={
        count > 0
          ? `${t("cart.title")} (${plural("cart.items", count)})`
          : t("cart.title")
      }
      className="relative size-10"
    >
      <ShoppingBagIcon />
      <AnimatePresence>
        {count > 0 ? (
          <motion.span
            key={count}
            initial={shouldReduceMotion ? false : { scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="bg-accent-gold text-accent-gold-foreground absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full text-[10px] font-medium"
          >
            {count > 9 ? "9+" : count}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </Button>
  )
}
