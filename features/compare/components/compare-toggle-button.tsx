"use client"

import { ScaleIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useCompare } from "@/features/compare/context/compare-context"

interface CompareToggleButtonProps {
  productId: string
  className?: string
}

export function CompareToggleButton({
  productId,
  className,
}: CompareToggleButtonProps) {
  const { has, add, remove } = useCompare()
  const active = has(productId)

  function handleClick(event: React.MouseEvent) {
    event.preventDefault()
    event.stopPropagation()
    if (active) remove(productId)
    else add(productId)
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="icon"
      onClick={handleClick}
      className={cn("bg-background/80 backdrop-blur", className)}
      aria-label={active ? "Retirer du comparateur" : "Ajouter au comparateur"}
      aria-pressed={active}
    >
      <ScaleIcon
        className={cn(
          "size-4",
          active && "text-accent-gold fill-accent-gold/20"
        )}
      />
    </Button>
  )
}
