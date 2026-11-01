"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import {
  adminTransitionSellerOrderAction,
  transitionSellerOrderAction,
} from "@/features/sellers/actions/seller-order-actions"
import { ReasonDialog } from "@/features/sellers/components/reason-dialog"
import { SELLER_ORDER_ACTION_LABELS } from "@/features/sellers/lib/seller-labels"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { SellerOrderStatus } from "@/types/seller-order"

type Target =
  | { kind: "store"; sellerId: string; orderId: string }
  | { kind: "admin"; subOrderId: string }

/**
 * The next steps of one sub-order, computed on the server from the
 * transition rules and the member's permissions. The server re-checks both.
 */
export function SellerOrderActions({
  target,
  nextStatuses,
  askTracking,
}: {
  target: Target
  nextStatuses: SellerOrderStatus[]
  askTracking: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [tracking, setTracking] = useState("")

  async function transition(to: SellerOrderStatus, note: string | null) {
    setBusy(true)
    try {
      const input = {
        to,
        note,
        trackingNumber:
          to === "shipped" && tracking.trim() ? tracking.trim() : null,
      }
      const result =
        target.kind === "store"
          ? await transitionSellerOrderAction(
              target.sellerId,
              target.orderId,
              input
            )
          : await adminTransitionSellerOrderAction(target.subOrderId, input)
      if (!result.success) {
        toast.error(result.error)
        return false
      }
      toast.success(
        result.data.changed ? "Commande mise à jour." : "Déjà à jour."
      )
      router.refresh()
      return true
    } finally {
      setBusy(false)
    }
  }

  if (nextStatuses.length === 0) return null

  return (
    <div className="flex flex-col gap-3">
      {askTracking && nextStatuses.includes("shipped") ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="tracking" className="text-sm">
            Numéro de suivi (facultatif)
          </label>
          <Input
            id="tracking"
            value={tracking}
            maxLength={100}
            onChange={(event) => setTracking(event.target.value)}
          />
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {nextStatuses
          .filter((to) => to !== "cancelled")
          .map((to) => (
            <Button
              key={to}
              disabled={busy}
              onClick={() => transition(to, null)}
            >
              {SELLER_ORDER_ACTION_LABELS[to]}
            </Button>
          ))}
        {nextStatuses.includes("cancelled") ? (
          <ReasonDialog
            trigger={
              <Button variant="outline" disabled={busy}>
                Annuler
              </Button>
            }
            title="Annuler cette commande"
            description="Les articles reviennent en stock. Le client sera remboursé de sa part."
            confirmLabel="Annuler la commande"
            onConfirm={(reason) => transition("cancelled", reason)}
          />
        ) : null}
      </div>
    </div>
  )
}
