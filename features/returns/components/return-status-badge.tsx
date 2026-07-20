import { Badge } from "@/components/ui/badge"
import type { ReturnStatus } from "@/types/return"

const STATUS_LABELS: Record<ReturnStatus, string> = {
  requested: "Demandé",
  approved: "Approuvé",
  rejected: "Refusé",
  received: "Reçu",
  refunded: "Remboursé",
}

const STATUS_VARIANTS: Record<
  ReturnStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  requested: "secondary",
  approved: "default",
  rejected: "destructive",
  received: "default",
  refunded: "outline",
}

export function ReturnStatusBadge({ status }: { status: ReturnStatus }) {
  return (
    <Badge variant={STATUS_VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>
  )
}
