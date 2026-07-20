import type { Product } from "@/types/product"

const PRICE_PROXIMITY_RATIO = 0.2

function effectivePriceMinor(product: Product): number {
  return product.salePriceMinor ?? product.basePriceMinor
}

/**
 * Scores an already-fetched candidate pool against the current product —
 * entirely in-memory, no new Firestore query shape (the pool itself is
 * fetched the same way "Vous pourriez aussi aimer" already was: same
 * category, published, capped). Higher score = more similar.
 */
export function scoreSimilarProducts(
  current: Product,
  candidates: Product[]
): Product[] {
  const currentPrice = effectivePriceMinor(current)
  const currentGenderTags = new Set(
    current.tags.filter((tag) => ["femme", "homme", "unisexe"].includes(tag))
  )

  return candidates
    .filter((candidate) => candidate.id !== current.id)
    .map((candidate) => {
      let score = 0
      if (
        candidate.collectionIds.some((id) => current.collectionIds.includes(id))
      ) {
        score += 2
      }
      if (candidate.brand && candidate.brand === current.brand) {
        score += 2
      }
      const candidatePrice = effectivePriceMinor(candidate)
      if (
        currentPrice > 0 &&
        Math.abs(candidatePrice - currentPrice) / currentPrice <=
          PRICE_PROXIMITY_RATIO
      ) {
        score += 1
      }
      if (candidate.tags.some((tag) => currentGenderTags.has(tag))) {
        score += 1
      }
      return { candidate, score }
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return b.candidate.ratingAverage - a.candidate.ratingAverage
    })
    .map(({ candidate }) => candidate)
}
