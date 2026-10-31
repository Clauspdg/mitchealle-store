import Link from "next/link"
import type { Metadata } from "next"
import { BoxesIcon } from "lucide-react"

import { requireSellerCenterPage } from "@/lib/seller-center.server"
import { LOW_STOCK_THRESHOLD } from "@/services/firestore/seller/catalog"
import { listSellerProducts } from "@/services/firestore/seller/scoped-resources"
import { EmptyState } from "@/components/shared/empty-state"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { SellerStockEditor } from "@/features/sellers/components/seller-stock-editor"

export const metadata: Metadata = { title: "Stock" }
export const dynamic = "force-dynamic"

export default async function SellerInventoryPage({
  params,
}: {
  params: Promise<{ sellerId: string }>
}) {
  const { sellerId } = await params
  const context = await requireSellerCenterPage(sellerId, "inventory.edit")
  const products = await listSellerProducts(context)
  const rows = products
    .filter((product) => product.status !== "archived")
    .sort((a, b) => a.name.localeCompare(b.name, "fr"))
    .flatMap((product) =>
      product.variants.map((variant) => ({ product, variant }))
    )
    .sort((a, b) => a.variant.stock - b.variant.stock)

  return (
    <>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Stock</h1>
        <p className="text-muted-foreground text-sm">
          Quantités vendables par variante, les plus basses en premier. Une mise
          à jour du stock ne repasse pas par la modération.
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={BoxesIcon} title="Aucune variante en stock" />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produit</TableHead>
                <TableHead className="hidden sm:table-cell">Variante</TableHead>
                <TableHead className="hidden sm:table-cell">État</TableHead>
                <TableHead className="text-right">Stock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ product, variant }) => {
                const label =
                  [variant.size, variant.color].filter(Boolean).join(" · ") ||
                  variant.sku
                const state =
                  variant.stock <= 0 ? (
                    <Badge className="bg-destructive/10 text-destructive">
                      Rupture
                    </Badge>
                  ) : variant.stock <= LOW_STOCK_THRESHOLD ? (
                    <Badge className="bg-accent-gold-muted text-accent-gold-foreground">
                      Stock faible
                    </Badge>
                  ) : (
                    <Badge variant="outline">Disponible</Badge>
                  )
                return (
                  <TableRow key={`${product.id}-${variant.id}`}>
                    <TableCell className="max-w-40 whitespace-normal sm:max-w-64">
                      <Link
                        href={`/seller/${sellerId}/products/${product.id}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {product.name}
                      </Link>
                      {/* Phones: variant and state under the name. */}
                      <span className="text-muted-foreground mt-1 flex flex-wrap items-center gap-1.5 text-xs break-all sm:hidden">
                        {label} {state}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden sm:table-cell">
                      {label}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {state}
                    </TableCell>
                    <TableCell>
                      <SellerStockEditor
                        sellerId={sellerId}
                        productId={product.id}
                        variantId={variant.id}
                        stock={variant.stock}
                        label={`${product.name} ${label}`}
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  )
}
