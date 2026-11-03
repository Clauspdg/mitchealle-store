"use client"

import { cn } from "@/lib/utils"
import { useI18n } from "@/i18n/client"

interface PriceDisplayProps {
  basePriceMinor: number
  salePriceMinor: number | null
  currency: string
  size?: "sm" | "lg"
  className?: string
}

export function PriceDisplay({
  basePriceMinor,
  salePriceMinor,
  currency,
  size = "sm",
  className,
}: PriceDisplayProps) {
  const { price } = useI18n()
  const onSale = salePriceMinor !== null
  const priceClass = size === "lg" ? "text-2xl" : "text-base"

  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2", className)}>
      <span
        className={cn(
          "font-medium",
          priceClass,
          onSale && "text-accent-gold-text"
        )}
      >
        {price(onSale ? salePriceMinor : basePriceMinor, currency)}
      </span>
      {onSale ? (
        <span className="text-muted-foreground text-sm line-through">
          {price(basePriceMinor, currency)}
        </span>
      ) : null}
    </div>
  )
}
