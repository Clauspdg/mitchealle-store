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

/** `label` is the translated status on customer pages; the admin panel,
 * not translated yet, keeps the French one. */
export function ReturnStatusBadge({
  status,
  label,
}: {
  status: ReturnStatus
  label?: string
}) {
  return (
    <Badge variant={STATUS_VARIANTS[status]}>
      {label ?? STATUS_LABELS[status]}
    </Badge>
  )
}
