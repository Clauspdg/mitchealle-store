import "server-only"
import { FieldValue } from "firebase-admin/firestore"

import { adminDb } from "@/firebase/admin"
import { decodeCursor, encodeCursor } from "@/utils/pagination"
import type { CursorPage } from "@/types/pagination"
import type {
  ActivityLogCategory,
  ActivityLogDocument,
  ActivityLogEntry,
} from "@/types/activity-log"

const ACTIVITY_LOG_COLLECTION = "activityLog"
const PAGE_SIZE = 25
/** Bounded window used only for the free-text search path — see `listActivityLog`. */
const MAX_LOG_SCANNED = 500

/**
 * Single write path for every "journal" the brief asks for (error/payment/
 * refund/coupon/notification/admin_action) — see `types/activity-log.ts`.
 * Deliberately swallows its own errors: logging must never break the flow
 * that triggered it, same discipline as `dispatchNotification`.
 */
export async function logActivity(
  category: ActivityLogCategory,
  message: string,
  context: ActivityLogDocument["context"] = {}
): Promise<void> {
  try {
    await adminDb.collection(ACTIVITY_LOG_COLLECTION).add({
      category,
      message,
      context,
      createdAt: FieldValue.serverTimestamp(),
    })
  } catch (error) {
    console.error(
      `[logActivity] failed to log "${category}": ${message}`,
      error
    )
  }
}

function toEntry(
  id: string,
  data: FirebaseFirestore.DocumentData
): ActivityLogEntry {
  return { id, ...(data as ActivityLogDocument) }
}

interface CursorPayload {
  sortValue: unknown
  id: string
}

export interface ActivityLogSearchParams {
  category: ActivityLogCategory | "all"
  /** Free-text match against `message` — Firestore has no full-text index for
   * this field, so a search term switches to an in-memory filter over a
   * bounded recent window instead of true cursor pagination. */
  search: string
  cursor: string | null
}

/**
 * Two distinct query strategies, same shape as `listOrdersAdmin`'s
 * search-vs-filter split: an empty search term uses real Firestore cursor
 * pagination (optionally filtered by category); a non-empty term scans the
 * most recent `MAX_LOG_SCANNED` entries and filters in-memory, honestly
 * reporting no further pages beyond that window.
 */
export async function listActivityLog(
  params: ActivityLogSearchParams,
  pageSize = PAGE_SIZE
): Promise<CursorPage<ActivityLogEntry>> {
  const term = params.search.trim().toLowerCase()

  if (term) {
    let query: FirebaseFirestore.Query = adminDb.collection(
      ACTIVITY_LOG_COLLECTION
    )
    if (params.category !== "all") {
      query = query.where("category", "==", params.category)
    }
    const snapshot = await query
      .orderBy("createdAt", "desc")
      .limit(MAX_LOG_SCANNED)
      .get()

    const matches = snapshot.docs
      .map((doc) => toEntry(doc.id, doc.data()))
      .filter(
        (entry) =>
          entry.message.toLowerCase().includes(term) ||
          Object.values(entry.context).some((value) =>
            String(value).toLowerCase().includes(term)
          )
      )

    return {
      items: matches.slice(0, pageSize),
      nextCursor: null,
      hasMore: false,
    }
  }

  let query: FirebaseFirestore.Query = adminDb.collection(
    ACTIVITY_LOG_COLLECTION
  )
  if (params.category !== "all") {
    query = query.where("category", "==", params.category)
  }
  query = query
    .orderBy("createdAt", "desc")
    .orderBy("__name__", "desc")
    .limit(pageSize + 1)

  if (params.cursor) {
    const decoded = decodeCursor<CursorPayload>(params.cursor)
    query = query.startAfter(decoded.sortValue, decoded.id)
  }

  const snapshot = await query.get()
  const docs = snapshot.docs.slice(0, pageSize)
  const hasMore = snapshot.docs.length > pageSize
  const items = docs.map((doc) => toEntry(doc.id, doc.data()))

  const lastDoc = docs.at(-1)
  const nextCursor =
    hasMore && lastDoc
      ? encodeCursor({
          sortValue: lastDoc.get("createdAt"),
          id: lastDoc.id,
        } satisfies CursorPayload)
      : null

  return { items, nextCursor, hasMore }
}

const CSV_EXPORT_LIMIT = 1000

/** Mirrors `exportOrdersToCsv`'s shape — capped at `CSV_EXPORT_LIMIT` rows. */
export async function exportActivityLogToCsv(
  params: Pick<ActivityLogSearchParams, "category" | "search">
): Promise<string> {
  const { items } = await listActivityLog(
    { ...params, cursor: null },
    CSV_EXPORT_LIMIT
  )

  const header = ["category", "message", "context", "createdAt"]
  const rows = items.map((entry) => [
    entry.category,
    entry.message,
    JSON.stringify(entry.context),
    entry.createdAt.toDate().toISOString(),
  ])

  const escape = (value: string) =>
    /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value

  return [header, ...rows].map((row) => row.map(escape).join(",")).join("\n")
}
