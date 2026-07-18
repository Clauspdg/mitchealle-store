"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { getOrderStatusAction } from "@/features/payment/actions/checkout-actions"

interface OrderStatusPollerProps {
  orderId: string
  intervalMs?: number
}

/**
 * Re-polls order status while it's still `pending` — covers the brief race
 * between Stripe redirecting the customer back and the webhook actually
 * confirming payment. Stops as soon as the status changes (or after a
 * generous number of attempts, to avoid polling forever if the webhook
 * never arrives).
 */
export function OrderStatusPoller({
  orderId,
  intervalMs = 2000,
}: OrderStatusPollerProps) {
  const router = useRouter()
  const [attempts, setAttempts] = useState(0)

  useEffect(() => {
    if (attempts >= 15) return

    const timeout = setTimeout(async () => {
      const result = await getOrderStatusAction(orderId)
      if (result.success && result.data !== "pending") {
        router.refresh()
        return
      }
      setAttempts((count) => count + 1)
    }, intervalMs)

    return () => clearTimeout(timeout)
  }, [attempts, orderId, intervalMs, router])

  return (
    <p className="text-muted-foreground text-sm">
      Confirmation du paiement en cours...
    </p>
  )
}
