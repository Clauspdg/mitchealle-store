import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"

import { HOUSE_SELLER_ID } from "@/config/seller"
import { requirePermission } from "@/lib/session.server"
import { getProduct } from "@/services/firestore/products"
import { getCategory } from "@/services/firestore/categories"
import { listSellerDecisions } from "@/services/firestore/seller/admin"
import { AdminSidebar } from "@/components/layout/admin-sidebar"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DecisionHistory } from "@/features/sellers/components/decision-history"
import { ProductModerationPanel } from "@/features/sellers/components/product-moderation-panel"
import {
  MODERATION_BADGE,
  MODERATION_LABELS,
  PRODUCT_STATUS_LABELS,
} from "@/features/sellers/lib/seller-labels"
import { formatPriceMinor } from "@/utils/currency"

export const metadata: Metadata = { title: "Modération produit" }
export const dynamic = "force-dynamic"

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-sm break-words whitespace-pre-line">{value}</dd>
    </div>
  )
}

export default async function AdminProductModerationPage({
  params,
}: {
  params: Promise<{ productId: string }>
}) {
  await requirePermission("sellers")
  const { productId } = await params
  const product = await getProduct(productId)
  if (!product?.sellerId || product.sellerId === HOUSE_SELLER_ID) notFound()

  const [category, decisions] = await Promise.all([
    getCategory(product.categoryId),
    listSellerDecisions({ productId }),
  ])

  return (
    <div className="flex flex-1">
      <AdminSidebar />
      <div className="flex w-full min-w-0 flex-col gap-6 px-6 py-8">
        <Link
          href="/admin/sellers?tab=products"
          className="text-muted-foreground text-sm underline underline-offset-4"
        >
          ← Modération produits
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {product.name}
            </h1>
            <p className="text-muted-foreground text-sm">
              Boutique{" "}
              <Link
                href={`/admin/sellers/${product.sellerId}`}
                className="underline underline-offset-4"
              >
                {product.sellerName ?? product.sellerId}
              </Link>{" "}
              · version {product.moderationRevision ?? 0}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {product.moderation ? (
              <Badge className={MODERATION_BADGE[product.moderation]}>
                {MODERATION_LABELS[product.moderation]}
              </Badge>
            ) : null}
            <Badge variant="outline">
              {PRODUCT_STATUS_LABELS[product.status] ?? product.status}
            </Badge>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-3 rounded-lg border p-4">
              <h2 className="font-semibold">
                Images ({product.images.length})
              </h2>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {product.images.map((image) => (
                  // eslint-disable-next-line @next/next/no-img-element -- Storage URL, unknown dimensions
                  <img
                    key={image.url}
                    src={image.url}
                    alt={image.alt}
                    className="aspect-square w-full rounded-md border object-cover"
                  />
                ))}
              </div>
            </section>

            <section className="flex flex-col gap-4 rounded-lg border p-4">
              <h2 className="font-semibold">Fiche</h2>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Field label="Catégorie" value={category?.name ?? "—"} />
                <Field label="Marque" value={product.brand ?? "—"} />
                <Field label="SKU" value={product.sku} />
                <Field
                  label="Prix"
                  value={`${formatPriceMinor(product.basePriceMinor, product.currency)}${
                    product.salePriceMinor !== null
                      ? ` (promo ${formatPriceMinor(product.salePriceMinor, product.currency)})`
                      : ""
                  }`}
                />
              </dl>
              <Field
                label="Description courte"
                value={product.shortDescription || "—"}
              />
              <Field label="Description" value={product.description} />
              <Field
                label="SEO"
                value={`${product.seo.title || "—"}\n${product.seo.description || ""}`}
              />
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="font-semibold">
                Variantes ({product.variants.length})
              </h2>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Taille</TableHead>
                      <TableHead>Couleur</TableHead>
                      <TableHead className="text-right">Prix</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {product.variants.map((variant) => (
                      <TableRow key={variant.id}>
                        <TableCell>{variant.sku}</TableCell>
                        <TableCell>{variant.size ?? "—"}</TableCell>
                        <TableCell>{variant.color ?? "—"}</TableCell>
                        <TableCell className="text-right">
                          {variant.priceMinor !== null
                            ? formatPriceMinor(
                                variant.priceMinor,
                                product.currency
                              )
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {variant.stock}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          </div>

          <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-3 rounded-lg border p-4">
              <h2 className="font-semibold">Décision</h2>
              {product.moderation === "pending" ? (
                <ProductModerationPanel
                  productId={product.id}
                  revision={product.moderationRevision ?? 0}
                  productName={product.name}
                  storeName={product.sellerName ?? ""}
                />
              ) : product.moderation === "rejected" ? (
                <p className="text-sm">
                  Motif du refus : {product.moderationNote ?? "—"}
                </p>
              ) : (
                <p className="text-sm">Approuvé et publié.</p>
              )}
            </section>
            <section className="flex flex-col gap-3 rounded-lg border p-4">
              <h2 className="font-semibold">Historique</h2>
              <DecisionHistory decisions={decisions} productHref={null} />
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
