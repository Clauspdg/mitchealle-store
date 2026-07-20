import { StarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import type { ReviewStats } from "@/types/review"

const STAR_LEVELS = [5, 4, 3, 2, 1] as const

export function ReviewSummary({ stats }: { stats: ReviewStats }) {
  if (stats.count === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Aucun avis pour ce produit pour le moment.
      </p>
    )
  }

  const roundedAverage = Math.round(stats.average)

  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-10">
      <div className="flex shrink-0 flex-col items-center gap-1">
        <span className="font-heading text-4xl font-medium">
          {stats.average.toFixed(1)}
        </span>
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }, (_, index) => (
            <StarIcon
              key={index}
              className={cn(
                "size-4",
                index < roundedAverage
                  ? "fill-accent-gold text-accent-gold"
                  : "fill-muted text-muted"
              )}
            />
          ))}
        </div>
        <span className="text-muted-foreground text-xs">
          {stats.count} avis
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1.5">
        {STAR_LEVELS.map((star) => {
          const value = stats.distribution[star]
          const percent =
            stats.count > 0 ? Math.round((value / stats.count) * 100) : 0
          return (
            <div key={star} className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground w-8 shrink-0">
                {star}★
              </span>
              <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                <div
                  className="bg-accent-gold h-full rounded-full"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <span className="text-muted-foreground w-6 shrink-0 text-right">
                {value}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
