"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { XIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { emitCartUpdated } from "@/lib/cart-events.client"
import { QuantityStepper } from "@/features/cart/components/quantity-stepper"
import {
  removeCartItemAction,
  updateCartItemQuantityAction,
} from "@/features/cart/actions/cart-actions"
import { useI18n } from "@/i18n/client"

interface CartLineItemProps {
  productId: string
  productSlug: string
  productName: string
  imageUrl: string | null
  variantId: string
  variantLabel: string | null
  quantity: number
  unitPriceMinor: number
  currency: string
  maxQuantity: number
}

export function CartLineItem({
  productId,
  productSlug,
  productName,
  imageUrl,
  variantId,
  variantLabel,
  quantity,
  unitPriceMinor,
  currency,
  maxQuantity,
}: CartLineItemProps) {
  const { t, price } = useI18n()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [localQuantity, setLocalQuantity] = useState(quantity)

  function handleQuantityChange(next: number) {
    setLocalQuantity(next)
    startTransition(async () => {
      const result = await updateCartItemQuantityAction({
        productId,
        variantId,
        quantity: next,
      })
      if (!result.success) {
        toast.error(result.error)
        setLocalQuantity(quantity)
        return
      }
      emitCartUpdated()
      router.refresh()
    })
  }

  function handleRemove() {
    startTransition(async () => {
      const result = await removeCartItemAction(productId, variantId)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      emitCartUpdated()
      router.refresh()
    })
  }

  // Phones: name and price first, quantity and line total underneath, the
  // remove button always within reach. From `sm` up, a single row.
  return (
    <div className="flex items-start gap-3 py-4 sm:items-center sm:gap-4">
      <Link
        href={`/products/${productSlug}`}
        className="bg-muted size-16 shrink-0 overflow-hidden rounded-md sm:size-20"
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- external Storage URL
          <img
            src={imageUrl}
            alt={productName}
            className="size-full object-cover"
          />
        ) : null}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Link
            href={`/products/${productSlug}`}
            className="font-heading text-base break-words"
          >
            {productName}
          </Link>
          {variantLabel ? (
            <span className="text-muted-foreground text-xs">
              {variantLabel}
            </span>
          ) : null}
          <span className="text-sm">{price(unitPriceMinor, currency)}</span>
        </div>

        <div className="flex items-center justify-between gap-3 sm:gap-4">
          <QuantityStepper
            value={localQuantity}
            onChange={handleQuantityChange}
            max={maxQuantity}
            disabled={isPending}
          />
          <span className="text-right text-sm font-medium whitespace-nowrap sm:w-24">
            {price(unitPriceMinor * localQuantity, currency)}
          </span>
        </div>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="shrink-0"
        disabled={isPending}
        onClick={handleRemove}
        aria-label={t("cart.remove")}
      >
        <XIcon className="size-4" />
      </Button>
    </div>
  )
}
