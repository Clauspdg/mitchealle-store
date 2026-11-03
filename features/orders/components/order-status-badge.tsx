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
  // The amounts themselves are tracked one by one in `refunds`, each
  // "demandé", "en attente" or "effectué".
  refunded: "Remboursement accordé",
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

/** `label` is the translated status on migrated pages; the admin panel,
 * not translated yet, keeps the French one. */
export function OrderStatusBadge({
  status,
  label,
}: {
  status: OrderStatus
  label?: string
}) {
  return (
    <Badge variant={STATUS_VARIANTS[status]}>
      {label ?? STATUS_LABELS[status]}
    </Badge>
  )
}
