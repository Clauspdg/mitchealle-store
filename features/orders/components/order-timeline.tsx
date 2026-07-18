import type { OrderStatusHistoryEntry } from "@/types/order"

export function OrderTimeline({
  history,
}: {
  history: OrderStatusHistoryEntry[]
}) {
  return (
    <ol className="flex flex-col gap-4">
      {history.map((entry, index) => (
        <li key={index} className="flex gap-3 text-sm">
          <div className="bg-accent-gold mt-1 size-2 shrink-0 rounded-full" />
          <div className="flex flex-col">
            <span className="font-medium capitalize">{entry.status}</span>
            <span className="text-muted-foreground text-xs">
              {entry.at.toDate().toLocaleString("fr-FR")}
            </span>
            {entry.note ? (
              <span className="text-muted-foreground text-xs">
                {entry.note}
              </span>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  )
}
