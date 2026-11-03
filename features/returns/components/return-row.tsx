import Link from "next/link"

import { ReturnStatusBadge } from "@/features/returns/components/return-status-badge"
import type { Return } from "@/types/return"
import { getI18n } from "@/i18n/server"

export async function ReturnRow({ returnRequest }: { returnRequest: Return }) {
  const { t, plural, date } = await getI18n()
  return (
    <Link
      href={`/account/returns/${returnRequest.id}`}
      className="hover:bg-muted flex items-center justify-between gap-4 rounded-lg border p-4 text-sm transition-colors"
    >
      <div className="flex flex-col gap-1">
        <span className="font-medium">
          {plural("cart.items", returnRequest.items.length)}
        </span>
        <span className="text-muted-foreground text-xs">
          {date(returnRequest.createdAt.toDate(), "long")}
        </span>
      </div>
      <ReturnStatusBadge
        status={returnRequest.status}
        label={t(`returns.status.${returnRequest.status}`)}
      />
    </Link>
  )
}
