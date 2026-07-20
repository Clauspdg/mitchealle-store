"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import {
  refundOrderAction,
  requestRefundAction,
  updateOrderStatusAction,
} from "@/features/orders/actions/order-admin-actions"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ORDER_STATUSES, type Order, type OrderStatus } from "@/types/order"

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "En attente de paiement",
  confirmed: "Confirmée",
  paid: "Payée",
  processing: "En préparation",
  ready: "Prête à expédier",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
  refund_requested: "Remboursement demandé",
  refunded: "Remboursée",
}

/** Stock is only ever touched pre-payment (`pending`→`cancelled`) or via the
 * dedicated refund flow — plain status changes never move an order into or
 * out of `refunded` directly, avoiding an accidental double stock mutation. */
const PLAIN_STATUS_OPTIONS = ORDER_STATUSES.filter(
  (status) => status !== "refund_requested" && status !== "refunded"
)

export function OrderStatusControl({ order }: { order: Order }) {
  const router = useRouter()
  const [status, setStatus] = useState<OrderStatus>(order.status)
  const [submitting, setSubmitting] = useState(false)

  async function handleStatusChange(next: OrderStatus) {
    setSubmitting(true)
    try {
      const result = await updateOrderStatusAction(order.id, next)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      setStatus(next)
      toast.success("Statut mis à jour.")
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRequestRefund() {
    setSubmitting(true)
    try {
      const result = await requestRefundAction(
        order.id,
        "Demandé depuis le tableau de bord"
      )
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success("Remboursement demandé.")
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleConfirmRefund() {
    setSubmitting(true)
    try {
      const result = await refundOrderAction(
        order.id,
        "Approuvé depuis le tableau de bord"
      )
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success("Commande remboursée, stock restauré.")
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  const canRefund = !["pending", "cancelled", "refunded"].includes(order.status)

  return (
    <div className="flex flex-col gap-3 rounded-xl border p-4">
      <h2 className="font-heading text-base font-medium">Statut</h2>
      <Select
        value={status}
        onValueChange={(value) => handleStatusChange(value as OrderStatus)}
        disabled={submitting}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PLAIN_STATUS_OPTIONS.map((option) => (
            <SelectItem key={option} value={option}>
              {STATUS_LABELS[option]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {canRefund ? (
        <div className="flex flex-wrap gap-2 border-t pt-3">
          {order.status !== "refund_requested" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={submitting}
              onClick={handleRequestRefund}
            >
              Demander un remboursement
            </Button>
          ) : null}
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={submitting}
            onClick={handleConfirmRefund}
          >
            Rembourser (restaure le stock)
          </Button>
        </div>
      ) : null}
    </div>
  )
}
