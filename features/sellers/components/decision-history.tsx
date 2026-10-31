import Link from "next/link"

import {
  DECISION_LABELS,
  formatDateTime,
} from "@/features/sellers/lib/seller-labels"
import type { SellerDecision } from "@/types/seller"

export function DecisionHistory({
  decisions,
  showStore = false,
}: {
  decisions: SellerDecision[]
  showStore?: boolean
}) {
  if (decisions.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Aucune décision enregistrée.
      </p>
    )
  }

  return (
    <ol className="flex flex-col gap-3">
      {decisions.map((decision) => (
        <li key={decision.id} className="border-l-2 pl-3">
          <p className="text-sm font-medium">
            {DECISION_LABELS[decision.type]}
            {showStore ? (
              <>
                {" — "}
                {decision.sellerId ? (
                  <Link
                    href={`/admin/sellers/${decision.sellerId}`}
                    className="underline underline-offset-4"
                  >
                    {decision.storeName}
                  </Link>
                ) : decision.applicationId ? (
                  <Link
                    href={`/admin/sellers/applications/${decision.applicationId}`}
                    className="underline underline-offset-4"
                  >
                    {decision.storeName}
                  </Link>
                ) : (
                  decision.storeName
                )}
              </>
            ) : null}
          </p>
          <p className="text-muted-foreground text-xs">
            {formatDateTime(decision.createdAt.toMillis())} ·{" "}
            {decision.actorEmail ?? decision.actorUid}
          </p>
          {decision.reason ? (
            <p className="mt-1 text-sm">Motif : {decision.reason}</p>
          ) : null}
        </li>
      ))}
    </ol>
  )
}
