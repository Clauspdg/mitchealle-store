"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckIcon, ShoppingBagIcon } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { emitCartUpdated } from "@/lib/cart-events.client"
import { addToCartAction } from "@/features/cart/actions/cart-actions"

/** How long the success pulse (icon swap + scale bump) stays visible. */
const SUCCESS_PULSE_MS = 900

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
  const [justAdded, setJustAdded] = useState(false)

  async function handleClick() {
    setSubmitting(true)
    try {
      const result = await addToCartAction({ productId, variantId, quantity })
      if (result.success) {
        toast.success("Ajouté au panier.")
        emitCartUpdated()
        setJustAdded(true)
        setTimeout(() => setJustAdded(false), SUCCESS_PULSE_MS)
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
        className={cn(
          "transition-transform duration-200",
          justAdded && "scale-110",
          className
        )}
        aria-label={disabled ? "Rupture de stock" : "Ajouter au panier"}
      >
        {justAdded ? (
          <CheckIcon className="size-4" />
        ) : (
          <ShoppingBagIcon className="size-4" />
        )}
      </Button>
    )
  }

  return (
    <Button
      type="button"
      size="lg"
      disabled={disabled || submitting}
      onClick={handleClick}
      className={cn(
        "transition-transform duration-200",
        justAdded && "scale-[1.03]",
        className
      )}
    >
      {justAdded ? (
        <span className="flex items-center gap-2">
          <CheckIcon className="size-4" />
          Ajouté
        </span>
      ) : submitting ? (
        "Ajout..."
      ) : disabled ? (
        "Rupture de stock"
      ) : (
        "Ajouter au panier"
      )}
    </Button>
  )
}
