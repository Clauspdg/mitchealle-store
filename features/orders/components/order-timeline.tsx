import { STORE_TIME } from "@/config/region"
import type { Translator } from "@/i18n/translate"
import type { OrderStatusHistoryEntry } from "@/types/order"

/** With `i18n` and `statusLabel`, in the visitor's language; without, as
 * the admin panel (not translated yet) shows it. Notes are written by
 * people and the system, and shown as written. */
export function OrderTimeline({
  history,
  i18n,
  statusLabel,
}: {
  history: OrderStatusHistoryEntry[]
  i18n?: Translator
  statusLabel?: (status: string) => string
}) {
  return (
    <ol className="flex flex-col gap-4">
      {history.map((entry, index) => (
        <li key={index} className="flex gap-3 text-sm">
          <div className="bg-accent-gold mt-1 size-2 shrink-0 rounded-full" />
          <div className="flex flex-col">
            {/* Raw status codes are capitalized; translated labels already
                read as written. */}
            <span
              className={statusLabel ? "font-medium" : "font-medium capitalize"}
            >
              {statusLabel ? statusLabel(entry.status) : entry.status}
            </span>
            <span className="text-muted-foreground text-xs">
              {i18n
                ? i18n.dateTime(entry.at.toDate())
                : entry.at.toDate().toLocaleString("fr-FR", STORE_TIME)}
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
