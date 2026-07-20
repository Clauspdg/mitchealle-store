import { ReviewCard } from "@/features/reviews/components/review-card"
import { ReviewSummary } from "@/features/reviews/components/review-summary"
import type { Review, ReviewStats } from "@/types/review"

interface ReviewsSectionProps {
  reviews: Review[]
  stats: ReviewStats
}

export function ReviewsSection({ reviews, stats }: ReviewsSectionProps) {
  return (
    <section className="flex flex-col gap-6 border-t pt-8">
      <h2 className="font-heading text-2xl font-medium">Avis clients</h2>
      <ReviewSummary stats={stats} />
      {reviews.length > 0 ? (
        <div className="flex flex-col gap-6">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      ) : null}
    </section>
  )
}
