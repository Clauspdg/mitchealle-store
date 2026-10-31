import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"

import { hasSellerPermission } from "@/lib/seller-permissions"
import { requireSellerCenterPage } from "@/lib/seller-center.server"
import { listCategories } from "@/services/firestore/categories"
import { listSellerDecisions } from "@/services/firestore/seller/admin"
import { getSellerProduct } from "@/services/firestore/seller/scoped-resources"
import { ProductForm } from "@/features/catalog/components/product-form"
import { toClientSafeProduct } from "@/features/catalog/lib/product-mappers"
import { DecisionHistory } from "@/features/sellers/components/decision-history"
import { Badge } from "@/components/ui/badge"
import {
  MODERATION_BADGE,
  MODERATION_LABELS,
  PRODUCT_STATUS_LABELS,
} from "@/features/sellers/lib/seller-labels"
import { formatPriceMinor } from "@/utils/currency"

export const metadata: Metadata = { title: "Produit" }
export const dynamic = "force-dynamic"

const MODERATION_MESSAGES = {
  pending:
    "C.L.A.G vérifie ce produit. Il sera mis en ligne dès son approbation.",
  approved: "Ce produit est approuvé.",
  rejected: "Ce produit n'a pas été approuvé. Corrigez-le puis resoumettez-le.",
} as const

export default async function SellerProductPage({
  params,
}: {
  params: Promise<{ sellerId: string; productId: string }>
}) {
  const { sellerId, productId } = await params
  const context = await requireSellerCenterPage(sellerId, "products.view")
  const product = await getSellerProduct(context, productId)
  if (!product) notFound()

  const canEdit = hasSellerPermission(context.role, "products.edit")
  const [categories, decisions] = await Promise.all([
    canEdit ? listCategories({ activeOnly: true }) : Promise.resolve([]),
    listSellerDecisions({ productId }),
  ])
  const root = `/seller/${sellerId}`

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <Link
        href={`${root}/products`}
        className="text-muted-foreground text-sm underline underline-offset-4"
      >
        ← Produits
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">{product.name}</h1>
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

      {product.moderation ? (
        <section
          aria-label="Modération"
          className={
            product.moderation === "rejected"
              ? "border-destructive/40 bg-destructive/5 flex flex-col gap-1 rounded-lg border p-4"
              : "bg-muted/40 flex flex-col gap-1 rounded-lg border p-4"
          }
        >
          <p className="text-sm">{MODERATION_MESSAGES[product.moderation]}</p>
          {product.moderation === "rejected" && product.moderationNote ? (
            <p className="text-sm font-medium">
              Motif du refus : {product.moderationNote}
            </p>
          ) : null}
          {canEdit && product.moderation === "approved" ? (
            <p className="text-muted-foreground text-xs">
              Toute modification renvoie le produit en modération et le retire
              de la boutique en ligne jusqu&apos;à sa nouvelle approbation. Le
              stock se modifie sans validation depuis la page Stock.
            </p>
          ) : null}
        </section>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_18rem] [&>*]:min-w-0">
        {canEdit ? (
          <ProductForm
            sellerId={sellerId}
            product={toClientSafeProduct(product)}
            categories={categories.map(
              ({ createdAt, updatedAt, ...rest }) => rest
            )}
            collections={[]}
            brands={[]}
          />
        ) : (
          <section className="flex flex-col gap-3 rounded-lg border p-4">
            <h2 className="font-semibold">Fiche produit</h2>
            <p className="text-sm">{product.shortDescription}</p>
            <p className="text-sm">
              Prix :{" "}
              {formatPriceMinor(product.basePriceMinor, product.currency)}
            </p>
            <ul className="text-sm">
              {product.variants.map((variant) => (
                <li key={variant.id}>
                  {[variant.size, variant.color].filter(Boolean).join(" · ") ||
                    variant.sku}{" "}
                  : {variant.stock} en stock
                </li>
              ))}
            </ul>
            <p className="text-muted-foreground text-xs">
              Votre rôle permet de consulter ce produit et d&apos;ajuster son
              stock, pas de modifier sa fiche.
            </p>
          </section>
        )}

        <section className="flex h-fit flex-col gap-3 rounded-lg border p-4">
          <h2 className="font-semibold">Historique</h2>
          <DecisionHistory
            decisions={decisions}
            showActor={false}
            productHref={null}
          />
        </section>
      </div>
    </div>
  )
}
