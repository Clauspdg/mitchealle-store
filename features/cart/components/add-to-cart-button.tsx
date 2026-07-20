"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ShoppingBagIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { emitCartUpdated } from "@/lib/cart-events.client"
import { addToCartAction } from "@/features/cart/actions/cart-actions"

interface AddToCartButtonProps {
  productId: string
  variantId: string
  quantity: number
  disabled?: boolean
  className?: string
  /** Compact icon-only rendering for hover overlays (e.g. the catalog grid). */
  iconOnly?: boolean
}

export function AddToCartButton({
  productId,
  variantId,
  quantity,
  disabled = false,
  className,
  iconOnly = false,
}: AddToCartButtonProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  async function handleClick() {
    setSubmitting(true)
    try {
      const result = await addToCartAction({ productId, variantId, quantity })
      if (result.success) {
        toast.success("Ajouté au panier.")
        emitCartUpdated()
        router.refresh()
      } else {
        toast.error(result.error)
      }
    } finally {
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
        aria-label={disabled ? "Rupture de stock" : "Ajouter au panier"}
      >
        <ShoppingBagIcon className="size-4" />
      </Button>
    )
  }

  return (
    <Button
      type="button"
      size="lg"
      disabled={disabled || submitting}
      onClick={handleClick}
      className={className}
    >
      {submitting
        ? "Ajout..."
        : disabled
          ? "Rupture de stock"
          : "Ajouter au panier"}
    </Button>
  )
}
