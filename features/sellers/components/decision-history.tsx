import Link from "next/link"

import {
  DECISION_LABELS,
  formatDateTime,
} from "@/features/sellers/lib/seller-labels"
import type { SellerDecision } from "@/types/seller"

export function DecisionHistory({
  decisions,
  showStore = false,
  showActor = true,
  productHref = (productId) => `/admin/sellers/products/${productId}`,
}: {
  decisions: SellerDecision[]
  showStore?: boolean
  /** The Seller Center doesn't show which admin decided. */
  showActor?: boolean
  productHref?: ((productId: string) => string) | null
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
            {decision.productId && decision.productName ? (
              <>
                {" : "}
                {productHref ? (
                  <Link
                    href={productHref(decision.productId)}
                    className="underline underline-offset-4"
                  >
                    {decision.productName}
                  </Link>
                ) : (
                  decision.productName
                )}
              </>
            ) : null}
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
            {formatDateTime(decision.createdAt.toMillis())}
            {showActor
              ? ` · ${decision.actorEmail ?? decision.actorUid}`
              : null}
          </p>
          {decision.reason ? (
            <p className="mt-1 text-sm">Motif : {decision.reason}</p>
          ) : null}
        </li>
      ))}
    </ol>
  )
}
