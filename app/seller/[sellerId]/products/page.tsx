import Link from "next/link"
import type { Metadata } from "next"
import { PackageIcon } from "lucide-react"

import { hasSellerPermission } from "@/lib/seller-permissions"
import { requireSellerCenterPage } from "@/lib/seller-center.server"
import { listSellerProducts } from "@/services/firestore/seller/scoped-resources"
import { EmptyState } from "@/components/shared/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  MODERATION_BADGE,
  MODERATION_LABELS,
  PRODUCT_STATUS_LABELS,
} from "@/features/sellers/lib/seller-labels"
import { formatPriceMinor } from "@/utils/currency"

export const metadata: Metadata = { title: "Produits" }
export const dynamic = "force-dynamic"

export default async function SellerProductsPage({
  params,
}: {
  params: Promise<{ sellerId: string }>
}) {
  const { sellerId } = await params
  const context = await requireSellerCenterPage(sellerId, "products.view")
  const products = (await listSellerProducts(context)).sort(
    (a, b) => b.updatedAt.toMillis() - a.updatedAt.toMillis()
  )
  const canEdit = hasSellerPermission(context.role, "products.edit")
  const root = `/seller/${sellerId}`

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Produits</h1>
          <p className="text-muted-foreground text-sm">
            Chaque nouveau produit ou modification est vérifié par C.L.A.G avant
            sa mise en ligne.
          </p>
        </div>
        {canEdit ? (
          <Button
            render={<Link href={`${root}/products/new`} />}
            nativeButton={false}
          >
            Nouveau produit
          </Button>
        ) : null}
      </div>

      {products.length === 0 ? (
        <EmptyState
          icon={PackageIcon}
          title="Aucun produit"
          description="Ajoutez votre premier produit : il sera publié après validation."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produit</TableHead>
                <TableHead>Modération</TableHead>
                <TableHead className="hidden sm:table-cell">
                  Boutique en ligne
                </TableHead>
                <TableHead className="hidden text-right sm:table-cell">
                  Prix
                </TableHead>
                <TableHead className="text-right">Stock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="max-w-44 whitespace-normal sm:max-w-72">
                    <Link
                      href={`${root}/products/${product.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {product.name}
                    </Link>
                    {product.moderation === "rejected" &&
                    product.moderationNote ? (
                      <p className="text-destructive mt-1 truncate text-xs">
                        Motif : {product.moderationNote}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    {product.moderation ? (
                      <Badge className={MODERATION_BADGE[product.moderation]}>
                        {MODERATION_LABELS[product.moderation]}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden sm:table-cell">
                    {PRODUCT_STATUS_LABELS[product.status] ?? product.status}
                  </TableCell>
                  <TableCell className="hidden text-right whitespace-nowrap sm:table-cell">
                    {formatPriceMinor(
                      product.salePriceMinor ?? product.basePriceMinor,
                      product.currency
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {product.variants
                      .reduce((sum, v) => sum + Math.max(0, v.stock), 0)
                      .toLocaleString("fr-FR")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  )
}
