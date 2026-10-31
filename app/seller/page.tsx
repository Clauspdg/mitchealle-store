import Link from "next/link"
import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { StoreIcon } from "lucide-react"

import { requireSession } from "@/lib/session.server"
import { listSellerCenterStores } from "@/lib/seller-center.server"
import { EmptyState } from "@/components/shared/empty-state"
import { Button } from "@/components/ui/button"
import { MEMBER_ROLE_LABELS } from "@/features/sellers/lib/seller-labels"

export const metadata: Metadata = { title: "Mes boutiques" }
export const dynamic = "force-dynamic"

export default async function SellerHomePage() {
  await requireSession("customer")
  const stores = await listSellerCenterStores()
  if (stores.length === 1) redirect(`/seller/${stores[0].sellerId}`)

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Espace vendeur</h1>
        <p className="text-muted-foreground text-sm">
          Choisissez la boutique à gérer.
        </p>
      </div>
      {stores.length === 0 ? (
        <EmptyState
          icon={StoreIcon}
          title="Aucune boutique active"
          description="L'espace vendeur s'ouvre aux membres d'une boutique approuvée et active."
          action={
            <Button
              render={<Link href="/account/seller-application" />}
              nativeButton={false}
            >
              Vendre sur C.L.A.G
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {stores.map((store) => (
            <li key={store.sellerId}>
              <Link
                href={`/seller/${store.sellerId}`}
                className="hover:bg-muted flex items-center justify-between rounded-lg border p-4"
              >
                <span className="font-medium">{store.name}</span>
                <span className="text-muted-foreground text-sm">
                  {MEMBER_ROLE_LABELS[store.role]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
