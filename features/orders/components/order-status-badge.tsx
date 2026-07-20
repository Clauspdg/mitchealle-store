import { Badge } from "@/components/ui/badge"
import type { OrderStatus } from "@/types/order"

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

const STATUS_VARIANTS: Record<
  OrderStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "secondary",
  confirmed: "default",
  paid: "default",
  processing: "default",
  ready: "default",
  shipped: "default",
  delivered: "outline",
  cancelled: "destructive",
  refund_requested: "destructive",
  refunded: "destructive",
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge variant={STATUS_VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>
  )
}
