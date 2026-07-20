"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ZapIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { emitCartUpdated } from "@/lib/cart-events.client"
import { addToCartAction } from "@/features/cart/actions/cart-actions"

interface BuyNowButtonProps {
  productId: string
  variantId: string
  quantity: number
  disabled?: boolean
  className?: string
  /** Compact icon-only rendering for hover overlays (e.g. the catalog grid). */
  iconOnly?: boolean
}

/**
 * Mirrors `AddToCartButton` exactly (same action, same error handling) but
 * takes the customer straight to the existing `/checkout` page on success
 * instead of staying on the current page — no new checkout/payment logic,
 * just a shortcut through the flow that already exists.
 */
export function BuyNowButton({
  productId,
  variantId,
  quantity,
  disabled = false,
  className,
  iconOnly = false,
}: BuyNowButtonProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  async function handleClick() {
    setSubmitting(true)
    try {
      const result = await addToCartAction({ productId, variantId, quantity })
      if (result.success) {
        emitCartUpdated()
        router.push("/checkout")
      } else {
        toast.error(result.error)
        setSubmitting(false)
      }
    } catch {
      setSubmitting(false)
    }
  }

  if (iconOnly) {
    return (
      <Button
        type="button"
        size="icon"
        disabled={disabled || submitting}
        onClick={handleClick}
        className={className}
        aria-label="Acheter maintenant"
      >
        <ZapIcon className="size-4" />
      </Button>
    )
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      disabled={disabled || submitting}
      onClick={handleClick}
      className={className}
    >
      {submitting ? "Un instant..." : "Acheter maintenant"}
    </Button>
  )
}
