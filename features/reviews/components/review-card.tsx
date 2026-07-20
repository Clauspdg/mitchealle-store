import Image from "next/image"
import { BadgeCheckIcon, StarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type { Review } from "@/types/review"

function formatReviewDate(review: Review): string {
  return review.createdAt.toDate().toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="flex flex-col gap-3 border-b pb-6 last:border-b-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <Avatar size="sm">
            <AvatarFallback>
              {review.authorName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{review.authorName}</span>
            <span className="text-muted-foreground text-xs">
              {review.country} · {formatReviewDate(review)}
            </span>
          </div>
        </div>
        {review.verifiedPurchase ? (
          <span className="text-accent-gold-text flex shrink-0 items-center gap-1 text-xs">
            <BadgeCheckIcon className="size-3.5" />
            Achat vérifié
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }, (_, index) => (
          <StarIcon
            key={index}
            className={cn(
              "size-4",
              index < review.rating
                ? "fill-accent-gold text-accent-gold"
                : "fill-muted text-muted"
            )}
          />
        ))}
      </div>

      <p className="text-sm leading-relaxed">{review.comment}</p>

      {review.photoUrls.length > 0 ? (
        <div className="flex gap-2">
          {review.photoUrls.map((url) => (
            <div
              key={url}
              className="bg-muted relative size-16 overflow-hidden rounded-md"
            >
              <Image
                src={url}
                alt=""
                fill
                sizes="64px"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
