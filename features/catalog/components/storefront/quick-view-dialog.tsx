"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { EyeIcon, StarIcon } from "lucide-react"

import type { Product } from "@/types/product"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PriceDisplay } from "@/features/catalog/components/storefront/price-display"
import { PreorderBadge } from "@/features/catalog/components/storefront/preorder-badge"
import { ProductPurchasePanel } from "@/features/catalog/components/storefront/product-purchase-panel"

// Only plain-serializable fields are accepted here (never the full `Product`
// object) — `Product.createdAt`/`updatedAt` are Firestore `Timestamp` class
// instances, and React rejects passing non-plain objects from a Server
// Component to a Client Component across the RSC boundary.
export type QuickViewProduct = Pick<
  Product,
  | "id"
  | "slug"
  | "name"
  | "brand"
  | "shortDescription"
  | "images"
  | "basePriceMinor"
  | "salePriceMinor"
  | "currency"
  | "variants"
  | "ratingAverage"
  | "ratingCount"
  | "isComingSoon"
  | "isPreorderable"
>

interface QuickViewDialogProps {
  product: QuickViewProduct
}

export function QuickViewDialog({ product }: QuickViewDialogProps) {
  const [open, setOpen] = useState(false)
  const image = product.images[0]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="secondary"
        size="icon"
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setOpen(true)
        }}
        className="bg-background/80 backdrop-blur"
        aria-label="Aperçu rapide"
      >
        <EyeIcon className="size-4" />
      </Button>

      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">
            {product.name}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="bg-muted relative aspect-square overflow-hidden rounded-xl">
            {image ? (
              <Image
                src={image.url}
                alt={image.alt || product.name}
                fill
                sizes="(min-width: 640px) 320px, 90vw"
                className="object-cover"
              />
            ) : null}
          </div>

          <div className="flex flex-col gap-3">
            {product.brand ? (
              <span className="text-muted-foreground text-xs tracking-wide uppercase">
                {product.brand}
              </span>
            ) : null}

            <PreorderBadge
              isComingSoon={product.isComingSoon}
              isPreorderable={product.isPreorderable}
            />

            <PriceDisplay
              basePriceMinor={product.basePriceMinor}
              salePriceMinor={product.salePriceMinor}
              currency={product.currency}
              size="lg"
            />

            {product.ratingCount > 0 ? (
              <span className="text-muted-foreground flex items-center gap-1 text-xs">
                <StarIcon className="size-3 fill-current" />
                {product.ratingAverage.toFixed(1)} ({product.ratingCount})
              </span>
            ) : null}

            {product.shortDescription ? (
              <p className="text-muted-foreground text-sm">
                {product.shortDescription}
              </p>
            ) : null}

            <ProductPurchasePanel
              productId={product.id}
              variants={product.variants}
              showBuyNow
            />

            <Link
              href={`/products/${product.slug}`}
              className="text-sm underline underline-offset-4"
              onClick={() => setOpen(false)}
            >
              Voir tous les détails
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
