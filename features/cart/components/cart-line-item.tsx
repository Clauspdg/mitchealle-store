"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { XIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { formatPriceMinor } from "@/utils/currency"
import { emitCartUpdated } from "@/lib/cart-events.client"
import { QuantityStepper } from "@/features/cart/components/quantity-stepper"
import {
  removeCartItemAction,
  updateCartItemQuantityAction,
} from "@/features/cart/actions/cart-actions"

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

  return (
    <div className="flex items-center gap-4 py-4">
      <Link
        href={`/products/${productSlug}`}
        className="bg-muted size-20 shrink-0 overflow-hidden rounded-md"
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

      <div className="flex flex-1 flex-col gap-1">
        <Link
          href={`/products/${productSlug}`}
          className="font-heading text-base"
        >
          {productName}
        </Link>
        {variantLabel ? (
          <span className="text-muted-foreground text-xs">{variantLabel}</span>
        ) : null}
        <span className="text-sm">
          {formatPriceMinor(unitPriceMinor, currency)}
        </span>
      </div>

      <QuantityStepper
        value={localQuantity}
        onChange={handleQuantityChange}
        max={maxQuantity}
        disabled={isPending}
      />

      <span className="w-24 text-right text-sm font-medium">
        {formatPriceMinor(unitPriceMinor * localQuantity, currency)}
      </span>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={isPending}
        onClick={handleRemove}
        aria-label="Retirer du panier"
      >
        <XIcon className="size-4" />
      </Button>
    </div>
  )
}
