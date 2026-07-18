import "server-only"

import { adminDb } from "@/firebase/admin"
import { formatOrderNumber } from "@/validators/order.validator"

const COUNTERS_COLLECTION = "counters"

/**
 * Transactional, per-calendar-year order number sequence — see
 * docs/firestore-architecture.md §9. `counters/orders_{year}` resets every
 * year rather than growing forever, matching the human-readable
 * `MS-2026-000123` format.
 */
export async function getNextOrderNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const ref = adminDb.collection(COUNTERS_COLLECTION).doc(`orders_${year}`)

  const sequence = await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const lastNumber = snap.exists ? (snap.data()!.lastNumber as number) : 0
    const next = lastNumber + 1
    tx.set(ref, { lastNumber: next }, { merge: true })
    return next
  })

  return formatOrderNumber(year, sequence)
}
