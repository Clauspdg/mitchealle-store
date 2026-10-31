import Link from "next/link"
import type { Metadata } from "next"

import { requireSellerCenterPage } from "@/lib/seller-center.server"
import { listCategories } from "@/services/firestore/categories"
import { ProductForm } from "@/features/catalog/components/product-form"

export const metadata: Metadata = { title: "Nouveau produit" }
export const dynamic = "force-dynamic"

export default async function SellerNewProductPage({
  params,
}: {
  params: Promise<{ sellerId: string }>
}) {
  const { sellerId } = await params
  await requireSellerCenterPage(sellerId, "products.edit")
  const categories = await listCategories({ activeOnly: true })

  return (
    <div className="flex max-w-4xl min-w-0 flex-col gap-6">
      <Link
        href={`/seller/${sellerId}/products`}
        className="text-muted-foreground text-sm underline underline-offset-4"
      >
        ← Produits
      </Link>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Nouveau produit
        </h1>
        <p className="text-muted-foreground text-sm">
          Il sera vérifié par C.L.A.G, puis mis en ligne dès son approbation.
        </p>
      </div>
      <ProductForm
        sellerId={sellerId}
        categories={categories.map(({ createdAt, updatedAt, ...rest }) => rest)}
        collections={[]}
        brands={[]}
      />
    </div>
  )
}
