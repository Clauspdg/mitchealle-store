"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ShoppingBagIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { onCartUpdated } from "@/lib/cart-events.client"
import { getCartItemCountAction } from "@/features/cart/actions/cart-actions"

export function CartBadge() {
  const [count, setCount] = useState(0)

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
      {count > 0 ? (
        <span className="bg-accent-gold text-accent-gold-foreground absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full text-[10px] font-medium">
          {count > 9 ? "9+" : count}
        </span>
      ) : null}
    </Button>
  )
}
