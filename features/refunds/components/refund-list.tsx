import { Badge } from "@/components/ui/badge"
import { CompleteRefundButton } from "@/features/refunds/components/complete-refund-button"
import {
  REFUND_SOURCE_LABELS,
  REFUND_STATUS_HINTS,
  REFUND_STATUS_LABELS,
} from "@/lib/refunds"
import { formatPriceMinor } from "@/utils/currency"
import type { Refund, RefundStatus } from "@/types/refund"

export const REFUND_STATUS_BADGE: Record<RefundStatus, string> = {
  requested: "bg-muted text-foreground",
  pending: "bg-accent-gold-muted text-accent-gold-foreground",
  completed: "bg-brand-blue text-white",
  void: "bg-muted text-muted-foreground",
}

/** Every amount owed back on an order, with where it stands. Admins can
 * record a pending one as done. */
export function RefundList({
  refunds,
  canComplete = false,
}: {
  refunds: Refund[]
  canComplete?: boolean
}) {
  if (refunds.length === 0) return null

  return (
    <ul className="flex flex-col gap-3 text-sm">
      {refunds.map((refund) => {
        const amount = formatPriceMinor(refund.amountMinor, refund.currency)
        return (
          <li
            key={refund.id}
            className="flex flex-col gap-1 border-b pb-3 last:border-b-0 last:pb-0"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">
                {REFUND_SOURCE_LABELS[refund.source]}
                {refund.sellerName ? ` · ${refund.sellerName}` : ""}
              </span>
              <Badge className={REFUND_STATUS_BADGE[refund.status]}>
                {REFUND_STATUS_LABELS[refund.status]}
              </Badge>
            </div>
            <span className="flex justify-between gap-2">
              <span className="text-muted-foreground">
                {REFUND_STATUS_HINTS[refund.status]}
              </span>
              <span className="whitespace-nowrap">{amount}</span>
            </span>
            {refund.lines.length > 0 ? (
              <span className="text-muted-foreground text-xs">
                {refund.lines
                  .map((line) => `${line.nameSnapshot} × ${line.quantity}`)
                  .join(" · ")}
              </span>
            ) : null}
            {refund.reference ? (
              <span className="text-muted-foreground text-xs">
                Référence : {refund.reference}
              </span>
            ) : null}
            {canComplete && refund.status === "pending" ? (
              <div className="print:hidden">
                <CompleteRefundButton
                  refundId={refund.id}
                  amountLabel={amount}
                />
              </div>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
