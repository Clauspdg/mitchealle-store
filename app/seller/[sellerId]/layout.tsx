import Link from "next/link"

import { hasSellerPermission } from "@/lib/seller-permissions"
import {
  listSellerCenterStores,
  requireSellerCenterPage,
} from "@/lib/seller-center.server"
import { getSeller } from "@/services/firestore/seller/sellers"
import { SellerNav } from "@/features/sellers/components/seller-nav"
import { MEMBER_ROLE_LABELS } from "@/features/sellers/lib/seller-labels"

/**
 * Shell of one store. Each page below repeats the access check with its own
 * permission: a layout isn't re-run on every navigation, so it can't be the
 * only guard.
 */
export default async function SellerStoreLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ sellerId: string }>
}) {
  const { sellerId } = await params
  const context = await requireSellerCenterPage(sellerId, "store.view")
  const [seller, stores] = await Promise.all([
    getSeller(sellerId),
    listSellerCenterStores(),
  ])

  const root = `/seller/${sellerId}`
  const items = [
    { title: "Tableau de bord", href: root },
    ...(hasSellerPermission(context.role, "products.view")
      ? [{ title: "Produits", href: `${root}/products` }]
      : []),
    ...(hasSellerPermission(context.role, "inventory.edit")
      ? [{ title: "Stock", href: `${root}/inventory` }]
      : []),
  ]

  return (
    <div className="flex flex-1 flex-col">
      <div className="bg-muted/40 border-b">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 md:px-6">
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs">Espace vendeur</p>
            <p className="truncate font-semibold">{seller?.name}</p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">
              {MEMBER_ROLE_LABELS[context.role]}
            </span>
            {stores.length > 1 ? (
              <Link href="/seller" className="underline underline-offset-4">
                Changer de boutique
              </Link>
            ) : null}
          </div>
        </div>
      </div>
      <div className="flex flex-1 flex-col md:flex-row">
        <SellerNav items={items} rootHref={root} />
        <div className="flex w-full min-w-0 flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
          {children}
        </div>
      </div>
    </div>
  )
}
