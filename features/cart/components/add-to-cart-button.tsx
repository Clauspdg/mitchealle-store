"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
}

export function AddToCartButton({
  productId,
  variantId,
  quantity,
  disabled = false,
  className,
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
