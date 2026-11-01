import {
  SELLER_ORDER_STATUS_LABELS,
  formatDateTime,
} from "@/features/sellers/lib/seller-labels"
import type { SellerOrderHistoryEntry } from "@/types/seller-order"

export function SellerOrderHistory({
  history,
  showActor = false,
}: {
  history: SellerOrderHistoryEntry[]
  /** Admins see who acted; a store sees what happened. */
  showActor?: boolean
}) {
  const entries = [...history].sort((a, b) => b.at.toMillis() - a.at.toMillis())
  return (
    <ol className="flex flex-col gap-3">
      {entries.map((entry, index) => (
        <li key={index} className="border-l-2 pl-3">
          <p className="text-sm font-medium">
            {SELLER_ORDER_STATUS_LABELS[entry.status]}
          </p>
          <p className="text-muted-foreground text-xs">
            {formatDateTime(entry.at.toMillis())}
            {showActor
              ? ` · ${entry.byEmail ?? entry.by}`
              : entry.by === "system"
                ? " · automatique"
                : ""}
          </p>
          {entry.note ? <p className="mt-1 text-sm">{entry.note}</p> : null}
        </li>
      ))}
    </ol>
  )
}
