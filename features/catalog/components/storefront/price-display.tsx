import { cn } from "@/lib/utils"
import { formatPriceMinor } from "@/utils/currency"

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
  const onSale = salePriceMinor !== null
  const priceClass = size === "lg" ? "text-2xl" : "text-base"

  return (
    <div className={cn("flex items-baseline gap-2", className)}>
      <span
        className={cn("font-medium", priceClass, onSale && "text-accent-gold")}
      >
        {formatPriceMinor(onSale ? salePriceMinor : basePriceMinor, currency)}
      </span>
      {onSale ? (
        <span className="text-muted-foreground text-sm line-through">
          {formatPriceMinor(basePriceMinor, currency)}
        </span>
      ) : null}
    </div>
  )
}
