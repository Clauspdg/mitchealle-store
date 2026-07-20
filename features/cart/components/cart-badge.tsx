"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { ShoppingBagIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { onCartUpdated } from "@/lib/cart-events.client"
import { getCartItemCountAction } from "@/features/cart/actions/cart-actions"

export function CartBadge() {
  const [count, setCount] = useState(0)
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    function refresh() {
      getCartItemCountAction().then((result) => {
        if (result.success) setCount(result.data)
      })
    }

    refresh()
    return onCartUpdated(refresh)
  }, [])

  return (
    <Button
      render={<Link href="/cart" />}
      nativeButton={false}
      variant="ghost"
      size="icon"
      aria-label={`Panier${count > 0 ? ` (${count} article${count > 1 ? "s" : ""})` : ""}`}
      className="relative"
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
