import "server-only"

import { adminDb } from "@/firebase/admin"
import {
  formatInvoiceNumber,
  formatOrderNumber,
} from "@/validators/order.validator"

const COUNTERS_COLLECTION = "counters"

async function nextSequence(counterId: string): Promise<number> {
  const ref = adminDb.collection(COUNTERS_COLLECTION).doc(counterId)
  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const lastNumber = snap.exists ? (snap.data()!.lastNumber as number) : 0
    const next = lastNumber + 1
    tx.set(ref, { lastNumber: next }, { merge: true })
    return next
  })
}

/**
 * Transactional, per-calendar-year order number sequence — see
 * docs/firestore-architecture.md §9. `counters/orders_{year}` resets every
 * year rather than growing forever, matching the human-readable
 * `MS-2026-000123` format.
 */
export async function getNextOrderNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const sequence = await nextSequence(`orders_${year}`)
  return formatOrderNumber(year, sequence)
}

/** Sprint 8 — same per-year transactional sequence as order numbers, its
 * own counter document so invoice and order numbering never collide. */
export async function getNextInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const sequence = await nextSequence(`invoices_${year}`)
  return formatInvoiceNumber(year, sequence)
}
