import "server-only"

import { adminDb } from "@/firebase/admin"
import { decodeCursor, encodeCursor } from "@/utils/pagination"
import type { CursorPage } from "@/types/pagination"
import type {
  MovementType,
  StockMovement,
  StockMovementDocument,
} from "@/types/stock-movement"

const MOVEMENTS_COLLECTION = "stockMovements"
const PAGE_SIZE = 20

function toMovement(
  id: string,
  data: FirebaseFirestore.DocumentData
): StockMovement {
  return { id, ...(data as StockMovementDocument) }
}

interface CursorPayload {
  sortValue: unknown
  id: string
}

export async function listStockMovements(params: {
  type?: MovementType | "all"
  productId?: string
  cursor?: string | null
}): Promise<CursorPage<StockMovement>> {
  let query: FirebaseFirestore.Query = adminDb.collection(MOVEMENTS_COLLECTION)

  if (params.type && params.type !== "all") {
    query = query.where("type", "==", params.type)
  }
  if (params.productId) {
    query = query.where("productId", "==", params.productId)
  }

  let paged = query
    .orderBy("createdAt", "desc")
    .orderBy("__name__", "desc")
    .limit(PAGE_SIZE + 1)

  if (params.cursor) {
    const decoded = decodeCursor<CursorPayload>(params.cursor)
    paged = paged.startAfter(decoded.sortValue, decoded.id)
  }

  const snapshot = await paged.get()
  const docs = snapshot.docs.slice(0, PAGE_SIZE)
  const hasMore = snapshot.docs.length > PAGE_SIZE
  const items = docs.map((doc) => toMovement(doc.id, doc.data()))

  const lastDoc = docs.at(-1)
  const nextCursor =
    hasMore && lastDoc
      ? encodeCursor({
          sortValue: lastDoc.get("createdAt") ?? null,
          id: lastDoc.id,
        } satisfies CursorPayload)
      : null

  return { items, nextCursor, hasMore }
}

export async function listMovementsForVariant(
  productId: string,
  variantId: string,
  limit = 50
): Promise<StockMovement[]> {
  const snapshot = await adminDb
    .collection(MOVEMENTS_COLLECTION)
    .where("productId", "==", productId)
    .where("variantId", "==", variantId)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get()
  return snapshot.docs.map((doc) => toMovement(doc.id, doc.data()))
}

export async function exportMovementsToCsv(params: {
  type?: MovementType | "all"
}): Promise<string> {
  let query: FirebaseFirestore.Query = adminDb.collection(MOVEMENTS_COLLECTION)
  if (params.type && params.type !== "all") {
    query = query.where("type", "==", params.type)
  }

  const snapshot = await query.orderBy("createdAt", "desc").limit(1000).get()

  const header = [
    "id",
    "type",
    "productId",
    "variantId",
    "field",
    "quantityBefore",
    "quantityAfter",
    "delta",
    "reason",
    "reference",
    "actorId",
    "createdAt",
  ]

  const rows = snapshot.docs.map((doc) => {
    const data = toMovement(doc.id, doc.data())
    return [
      data.id,
      data.type,
      data.productId,
      data.variantId,
      data.field,
      String(data.quantityBefore),
      String(data.quantityAfter),
      String(data.delta),
      data.reason ?? "",
      data.reference ?? "",
      data.actorId,
      data.createdAt.toDate().toISOString(),
    ]
  })

  const escape = (value: string) =>
    /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value

  return [header, ...rows].map((row) => row.map(escape).join(",")).join("\n")
}
