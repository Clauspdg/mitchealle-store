"use client"

import { useEffect, useState } from "react"

import { onCartUpdated } from "@/lib/cart-events.client"
import { getCartItemCountAction } from "@/features/cart/actions/cart-actions"

export function useCartItemCount(): number {
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

  return count
}
