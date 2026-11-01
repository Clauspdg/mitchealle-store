"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { settleSimulatedPaymentAction } from "@/features/payment/actions/checkout-actions"
import { Button } from "@/components/ui/button"

export function SimulatedPaymentPanel({ orderId }: { orderId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function settle(outcome: "paid" | "abandoned") {
    setBusy(true)
    try {
      const result = await settleSimulatedPaymentAction(orderId, outcome)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      router.push(
        outcome === "paid"
          ? `/checkout/confirmation?orderId=${orderId}`
          : `/account/orders/${orderId}`
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button disabled={busy} onClick={() => settle("paid")}>
        Confirmer le paiement simulé
      </Button>
      <Button
        variant="outline"
        disabled={busy}
        onClick={() => settle("abandoned")}
      >
        Abandonner le paiement
      </Button>
    </div>
  )
}
