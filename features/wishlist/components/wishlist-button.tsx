"use client"

import { useState, useTransition } from "react"
import { HeartIcon } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  addToWishlistAction,
  removeFromWishlistAction,
} from "@/features/wishlist/actions/wishlist-actions"
import { useI18n } from "@/i18n/client"

interface WishlistButtonProps {
  productId: string
  variantId?: string | null
  initialIsInWishlist: boolean
  className?: string
}

export function WishlistButton({
  productId,
  variantId = null,
  initialIsInWishlist,
  className,
}: WishlistButtonProps) {
  const { t } = useI18n()
  const [isInWishlist, setIsInWishlist] = useState(initialIsInWishlist)
  const [isPending, startTransition] = useTransition()

  function handleClick(event: React.MouseEvent) {
    event.preventDefault()
    event.stopPropagation()

    const next = !isInWishlist
    setIsInWishlist(next)

    startTransition(async () => {
      const result = next
        ? await addToWishlistAction({ productId, variantId })
        : await removeFromWishlistAction(productId)

      if (!result.success) {
        setIsInWishlist(!next)
        toast.error(result.error)
      }
    })
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="icon"
      disabled={isPending}
      onClick={handleClick}
      className={cn("bg-background/80 backdrop-blur", className)}
      aria-label={
        isInWishlist ? t("catalog.wishlist.remove") : t("catalog.wishlist.add")
      }
      aria-pressed={isInWishlist}
    >
      <HeartIcon
        className={cn(
          "size-4",
          isInWishlist && "fill-destructive text-destructive"
        )}
      />
    </Button>
  )
}
