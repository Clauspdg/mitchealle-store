import Link from "next/link"

import { ReturnStatusBadge } from "@/features/returns/components/return-status-badge"
import type { Return } from "@/types/return"

export function ReturnRow({ returnRequest }: { returnRequest: Return }) {
  return (
    <Link
      href={`/account/returns/${returnRequest.id}`}
      className="hover:bg-muted flex items-center justify-between gap-4 rounded-lg border p-4 text-sm transition-colors"
    >
      <div className="flex flex-col gap-1">
        <span className="font-medium">
          {returnRequest.items.length} article
          {returnRequest.items.length > 1 ? "s" : ""}
        </span>
        <span className="text-muted-foreground text-xs">
          {returnRequest.createdAt.toDate().toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </span>
      </div>
      <ReturnStatusBadge status={returnRequest.status} />
    </Link>
  )
}
