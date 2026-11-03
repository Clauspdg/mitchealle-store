import { ReviewCard } from "@/features/reviews/components/review-card"
import { ReviewSummary } from "@/features/reviews/components/review-summary"
import type { Review, ReviewStats } from "@/types/review"
import { getI18n } from "@/i18n/server"

interface ReviewsSectionProps {
  reviews: Review[]
  stats: ReviewStats
}

export async function ReviewsSection({ reviews, stats }: ReviewsSectionProps) {
  const { t } = await getI18n()
  return (
    <section className="flex flex-col gap-6 border-t pt-8">
      <h2 className="font-heading text-2xl font-medium">
        {t("catalog.reviews.title")}
      </h2>
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
