import "server-only"

import { adminDb } from "@/firebase/admin"
import type { Review, ReviewDocument, ReviewStats } from "@/types/review"

const REVIEWS_COLLECTION = "reviews"
const DEFAULT_LIMIT = 20

function toReview(id: string, data: FirebaseFirestore.DocumentData): Review {
  return { id, ...(data as ReviewDocument) }
}

/**
 * Equality-only filter (`productId ==`) — no composite index needed, same
 * reasoning as every other query in this service-file family. Sorting is
 * done in memory (newest first) rather than via `orderBy` to avoid forcing
 * a composite index for this one new collection.
 */
export async function listReviewsForProduct(
  productId: string,
  limit = DEFAULT_LIMIT
): Promise<Review[]> {
  const snapshot = await adminDb
    .collection(REVIEWS_COLLECTION)
    .where("productId", "==", productId)
    .get()

  return snapshot.docs
    .map((doc) => toReview(doc.id, doc.data()))
    .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
    .slice(0, limit)
}

export async function getReviewStatsForProduct(
  productId: string
): Promise<ReviewStats> {
  const snapshot = await adminDb
    .collection(REVIEWS_COLLECTION)
    .where("productId", "==", productId)
    .get()

  const distribution: ReviewStats["distribution"] = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  }
  let total = 0

  snapshot.docs.forEach((doc) => {
    const rating = doc.data().rating as number
    const bucket = Math.min(5, Math.max(1, Math.round(rating))) as
      1 | 2 | 3 | 4 | 5
    distribution[bucket] += 1
    total += rating
  })

  const count = snapshot.size
  return {
    average: count > 0 ? Math.round((total / count) * 10) / 10 : 0,
    count,
    distribution,
  }
}
