import Link from "next/link"
import type { Metadata } from "next"
import { ShoppingBagIcon } from "lucide-react"

import { requireSession } from "@/lib/session.server"
import { getCart } from "@/services/firestore/carts"
import { getProduct } from "@/services/firestore/products"
import { getStoreSettings } from "@/services/firestore/settings"
import { EmptyState } from "@/components/shared/empty-state"
import { CartLineItem } from "@/features/cart/components/cart-line-item"
import { CartSummary } from "@/features/cart/components/cart-summary"
import { Button } from "@/components/ui/button"
import { getI18n } from "@/i18n/server"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t("cart.title") }
}

export default async function CartPage() {
  const { t } = await getI18n()
  const session = await requireSession("customer")
  const cart = await getCart(session.uid)

  if (cart.items.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-12 sm:px-6">
        <h1 className="font-heading text-3xl font-medium">{t("cart.title")}</h1>
        <EmptyState
          icon={ShoppingBagIcon}
          title={t("cart.emptyTitle")}
          description={t("cart.emptyText")}
          action={
            <Button render={<Link href="/products" />} nativeButton={false}>
              {t("cart.browse")}
            </Button>
          }
        />
      </div>
    )
  }

  const [products, { currency }] = await Promise.all([
    Promise.all(cart.items.map((item) => getProduct(item.productId))),
    getStoreSettings(),
  ])

  const lines = cart.items.map((item, index) => {
    const product = products[index]
    const variant = product?.variants.find((v) => v.id === item.variantId)

    return {
      key: `${item.productId}_${item.variantId}`,
      productId: item.productId,
      productSlug: product?.slug ?? "",
      productName: product?.name ?? t("cart.unavailable"),
      imageUrl: product?.images[0]?.url ?? null,
      variantId: item.variantId,
      variantLabel:
        [variant?.size, variant?.color].filter(Boolean).join(" / ") || null,
      quantity: item.quantity,
      unitPriceMinor: item.unitPriceMinorSnapshot,
      currency: product?.currency ?? currency,
      maxQuantity: Math.max(item.quantity, variant?.stock ?? item.quantity),
    }
  })

  // A line priced in another currency can't be ordered, and its digits
  // don't belong in this total.
  const payable = lines.filter((line) => line.currency === currency)
  const subtotalMinor = payable.reduce(
    (sum, line) => sum + line.unitPriceMinor * line.quantity,
    0
  )

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-12 sm:px-6">
      <h1 className="font-heading text-3xl font-medium">{t("cart.title")}</h1>

      <div className="grid gap-8 lg:grid-cols-3 [&>*]:min-w-0">
        <div className="divide-y lg:col-span-2">
          {lines.map(({ key, ...line }) => (
            <CartLineItem key={key} {...line} />
          ))}
        </div>

        <div>
          <CartSummary
            subtotalMinor={subtotalMinor}
            currency={currency}
            blockedCount={lines.length - payable.length}
          />
        </div>
      </div>
    </div>
  )
}
