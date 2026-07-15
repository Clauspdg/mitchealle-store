import "server-only"
import { AggregateField, Timestamp } from "firebase-admin/firestore"

import { adminDb } from "@/firebase/admin"
import { decodeCursor, encodeCursor } from "@/utils/pagination"
import { computeInventoryMutation } from "@/validators/inventory.validator"
import type { InventorySearchParams } from "@/schemas/inventory.schema"
import { DEFAULT_WAREHOUSE } from "@/types/inventory"
import type { Inventory, InventoryDocument } from "@/types/inventory"
import type { CursorPage } from "@/types/pagination"
import type { MovementField, MovementType } from "@/types/stock-movement"

const INVENTORY_COLLECTION = "inventory"
const MOVEMENTS_COLLECTION = "stockMovements"
const PAGE_SIZE = 20

function inventoryDocId(productId: string, variantId: string): string {
  return `${productId}_${variantId}`
}

function toInventory(
  id: string,
  data: FirebaseFirestore.DocumentData
): Inventory {
  return { id, ...(data as InventoryDocument) }
}

export async function getInventory(
  productId: string,
  variantId: string
): Promise<Inventory | null> {
  const doc = await adminDb
    .collection(INVENTORY_COLLECTION)
    .doc(inventoryDocId(productId, variantId))
    .get()
  return doc.exists ? toInventory(doc.id, doc.data()!) : null
}

export async function listInventoryForProduct(
  productId: string
): Promise<Inventory[]> {
  const snapshot = await adminDb
    .collection(INVENTORY_COLLECTION)
    .where("productId", "==", productId)
    .get()
  return snapshot.docs.map((doc) => toInventory(doc.id, doc.data()))
}

interface CursorPayload {
  sortValue: unknown
  id: string
}

export async function listInventory(
  params: InventorySearchParams
): Promise<CursorPage<Inventory>> {
  let query: FirebaseFirestore.Query = adminDb.collection(INVENTORY_COLLECTION)

  if (params.warehouseLocation) {
    query = query.where("warehouseLocation", "==", params.warehouseLocation)
  }
  if (params.lowStockOnly) {
    query = query.where("isLowStock", "==", true)
  }
  if (params.sku.trim()) {
    const term = params.sku.trim().toUpperCase()
    query = query
      .where("sku", ">=", term)
      .where("sku", "<=", term + String.fromCodePoint(0xf8ff))
      .orderBy("sku", "asc")
  } else {
    const [field, direction] =
      params.sort === "quantityAvailable_asc"
        ? (["quantityAvailable", "asc"] as const)
        : params.sort === "quantityAvailable_desc"
          ? (["quantityAvailable", "desc"] as const)
          : (["updatedAt", "desc"] as const)
    query = query.orderBy(field, direction)
  }

  let paged = query.orderBy("__name__", "asc").limit(PAGE_SIZE + 1)
  if (params.cursor) {
    const decoded = decodeCursor<CursorPayload>(params.cursor)
    paged = paged.startAfter(decoded.sortValue, decoded.id)
  }

  const snapshot = await paged.get()
  const docs = snapshot.docs.slice(0, PAGE_SIZE)
  const hasMore = snapshot.docs.length > PAGE_SIZE
  const items = docs.map((doc) => toInventory(doc.id, doc.data()))

  const lastDoc = docs.at(-1)
  const sortField = params.sku.trim()
    ? "sku"
    : params.sort === "updatedAt_desc"
      ? "updatedAt"
      : "quantityAvailable"
  const nextCursor =
    hasMore && lastDoc
      ? encodeCursor({
          sortValue: lastDoc.get(sortField) ?? null,
          id: lastDoc.id,
        } satisfies CursorPayload)
      : null

  return { items, nextCursor, hasMore }
}

export async function listLowStockInventory(limit = 20): Promise<Inventory[]> {
  const snapshot = await adminDb
    .collection(INVENTORY_COLLECTION)
    .where("isLowStock", "==", true)
    .orderBy("updatedAt", "desc")
    .limit(limit)
    .get()
  return snapshot.docs.map((doc) => toInventory(doc.id, doc.data()))
}

export async function countInventoryStats(): Promise<{
  totalOnHand: number
  lowStockCount: number
  outOfStockCount: number
}> {
  const [lowStockSnap, outOfStockSnap, sumSnap] = await Promise.all([
    adminDb
      .collection(INVENTORY_COLLECTION)
      .where("isLowStock", "==", true)
      .count()
      .get(),
    adminDb
      .collection(INVENTORY_COLLECTION)
      .where("quantityAvailable", "<=", 0)
      .count()
      .get(),
    adminDb
      .collection(INVENTORY_COLLECTION)
      .aggregate({ totalOnHand: AggregateField.sum("quantityOnHand") })
      .get(),
  ])

  return {
    totalOnHand: sumSnap.data().totalOnHand ?? 0,
    lowStockCount: lowStockSnap.data().count,
    outOfStockCount: outOfStockSnap.data().count,
  }
}

export async function countProductsInTransit(): Promise<number> {
  const snapshot = await adminDb
    .collection(INVENTORY_COLLECTION)
    .where("quantityInTransit", ">", 0)
    .count()
    .get()
  return snapshot.data().count
}

/**
 * Approximate retail value of on-hand stock (`basePriceMinor × quantityOnHand`,
 * summed) — the one dashboard stat that can't be answered by a bounded,
 * indexed query alone, since Firestore has no per-document "value" field to
 * aggregate. Scans up to `limit` inventory docs; `truncated` tells the
 * caller if the real catalog is bigger than that, so the UI can be honest
 * about it rather than silently under-reporting. See
 * docs/firestore-architecture.md §9/§11 — a periodic rollup (à la
 * `analytics`) is the documented upgrade path if this ever matters at
 * scale.
 */
export async function estimateStockValueMinor(
  limit = 500
): Promise<{
  estimatedValueMinor: number
  scanned: number
  truncated: boolean
}> {
  const snapshot = await adminDb
    .collection(INVENTORY_COLLECTION)
    .limit(limit + 1)
    .get()
  const docs = snapshot.docs.slice(0, limit)
  const truncated = snapshot.docs.length > limit

  const productIds = Array.from(
    new Set(docs.map((doc) => (doc.data() as InventoryDocument).productId))
  )
  const productDocs = await Promise.all(
    productIds.map((id) => adminDb.collection("products").doc(id).get())
  )
  const priceByProductId = new Map(
    productDocs
      .filter((doc) => doc.exists)
      .map((doc) => [doc.id, doc.data()!.basePriceMinor as number])
  )

  const estimatedValueMinor = docs.reduce((sum, doc) => {
    const data = doc.data() as InventoryDocument
    const price = priceByProductId.get(data.productId) ?? 0
    return sum + price * data.quantityOnHand
  }, 0)

  return { estimatedValueMinor, scanned: docs.length, truncated }
}

interface MovementParams {
  productId: string
  variantId: string
  field: MovementField
  type: MovementType
  actorId: string
  reason: string | null
  reference: string | null
  /** Computed from the freshest in-transaction value — never from a stale outside read. */
  computeDelta: (before: number) => number
  /** Used only if the inventory document doesn't exist yet (lazy-created). */
  createDefaults?: { sku: string; reorderThreshold: number }
}

/**
 * Core transactional mutator — every inventory write in this module goes
 * through this function. Reads and writes exactly one `inventory` document
 * and appends exactly one `stockMovements` document, inside a single
 * `runTransaction`, per docs/firestore-architecture.md §5.2.
 */
async function applyMovement(params: MovementParams): Promise<Inventory> {
  const id = inventoryDocId(params.productId, params.variantId)
  const ref = adminDb.collection(INVENTORY_COLLECTION).doc(id)
  const movementRef = adminDb.collection(MOVEMENTS_COLLECTION).doc()

  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const now = Timestamp.now()

    const current: InventoryDocument = snap.exists
      ? (snap.data() as InventoryDocument)
      : {
          productId: params.productId,
          variantId: params.variantId,
          sku: params.createDefaults?.sku ?? "",
          warehouseLocation: DEFAULT_WAREHOUSE,
          quantityOnHand: 0,
          quantityReserved: 0,
          quantityInTransit: 0,
          quantityDamaged: 0,
          quantityAvailable: 0,
          reorderThreshold: params.createDefaults?.reorderThreshold ?? 0,
          isLowStock: true,
          lastRestockedAt: null,
          updatedAt: now,
        }

    const delta = params.computeDelta(current[params.field])
    const { after, quantityAvailable, isLowStock, before } =
      computeInventoryMutation(current, params.field, params.type, delta)

    const next: InventoryDocument = {
      ...current,
      [params.field]: after,
      quantityAvailable,
      isLowStock,
      lastRestockedAt:
        params.type === "stockIn" || params.type === "shipmentReceived"
          ? now
          : current.lastRestockedAt,
      updatedAt: now,
    }

    tx.set(ref, next)
    tx.set(movementRef, {
      type: params.type,
      productId: params.productId,
      variantId: params.variantId,
      warehouseLocation: current.warehouseLocation,
      field: params.field,
      quantityBefore: before,
      quantityAfter: after,
      delta,
      reason: params.reason,
      reference: params.reference,
      actorId: params.actorId,
      createdAt: now,
    })

    return { id, ...next }
  })
}

export async function adjustInventory(
  input: {
    productId: string
    variantId: string
    field: "quantityOnHand" | "quantityDamaged"
    newQuantity: number
    reason: string
    sku: string
  },
  actorId: string
): Promise<Inventory> {
  return applyMovement({
    productId: input.productId,
    variantId: input.variantId,
    field: input.field,
    type: "adjustment",
    actorId,
    reason: input.reason,
    reference: null,
    computeDelta: (before) => input.newQuantity - before,
    createDefaults: { sku: input.sku, reorderThreshold: 0 },
  })
}

export async function reserveInventory(
  input: {
    productId: string
    variantId: string
    quantity: number
    reference: string | null
  },
  actorId: string
): Promise<Inventory> {
  return applyMovement({
    productId: input.productId,
    variantId: input.variantId,
    field: "quantityReserved",
    type: "reservation",
    actorId,
    reason: null,
    reference: input.reference,
    computeDelta: () => input.quantity,
  })
}

export async function releaseInventory(
  input: {
    productId: string
    variantId: string
    quantity: number
    reference: string | null
  },
  actorId: string
): Promise<Inventory> {
  return applyMovement({
    productId: input.productId,
    variantId: input.variantId,
    field: "quantityReserved",
    type: "release",
    actorId,
    reason: null,
    reference: input.reference,
    computeDelta: () => -input.quantity,
  })
}

export async function stockIn(
  input: {
    productId: string
    variantId: string
    quantity: number
    reason: string | null
    reference: string | null
    sku: string
  },
  actorId: string
): Promise<Inventory> {
  return applyMovement({
    productId: input.productId,
    variantId: input.variantId,
    field: "quantityOnHand",
    type: "stockIn",
    actorId,
    reason: input.reason,
    reference: input.reference,
    computeDelta: () => input.quantity,
    createDefaults: { sku: input.sku, reorderThreshold: 0 },
  })
}

export async function stockOut(
  input: {
    productId: string
    variantId: string
    quantity: number
    reason: string
    reference: string | null
  },
  actorId: string
): Promise<Inventory> {
  return applyMovement({
    productId: input.productId,
    variantId: input.variantId,
    field: "quantityOnHand",
    type: "stockOut",
    actorId,
    reason: input.reason,
    reference: input.reference,
    computeDelta: () => -input.quantity,
  })
}

export async function updateReorderThreshold(
  productId: string,
  variantId: string,
  reorderThreshold: number
): Promise<void> {
  const ref = adminDb
    .collection(INVENTORY_COLLECTION)
    .doc(inventoryDocId(productId, variantId))

  await adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) {
      throw new Error("Aucun enregistrement de stock pour ce produit/variante.")
    }
    const current = snap.data() as InventoryDocument
    const isLowStock = current.quantityAvailable <= reorderThreshold
    tx.update(ref, { reorderThreshold, isLowStock, updatedAt: Timestamp.now() })
  })
}

/**
 * Called by the shipment-receiving flow (services/firestore/incoming-shipments.ts)
 * — increments `quantityOnHand` and decrements `quantityInTransit` for one
 * item, writing two `stockMovements` entries linked by the same
 * `reference` (the shipment id). Exported so the shipments service can
 * compose it inside its own larger transaction... in practice Firestore
 * doesn't allow nesting transactions, so this is called with its own
 * transaction per item from a `Promise.all` — each item is an independent
 * unit, acceptable since items within one shipment don't share state.
 */
export async function receiveShipmentLineItem(
  input: {
    productId: string
    variantId: string
    quantityReceivedNow: number
    shipmentReference: string
    sku: string
  },
  actorId: string
): Promise<void> {
  if (input.quantityReceivedNow <= 0) return

  await applyMovement({
    productId: input.productId,
    variantId: input.variantId,
    field: "quantityOnHand",
    type: "shipmentReceived",
    actorId,
    reason: null,
    reference: input.shipmentReference,
    computeDelta: () => input.quantityReceivedNow,
    createDefaults: { sku: input.sku, reorderThreshold: 0 },
  })

  await applyMovement({
    productId: input.productId,
    variantId: input.variantId,
    field: "quantityInTransit",
    type: "shipmentReceived",
    actorId,
    reason: null,
    reference: input.shipmentReference,
    // In-transit can't go negative even if it was under-tracked — clamp at 0.
    computeDelta: (before) => -Math.min(input.quantityReceivedNow, before),
  })
}

/** Called when a shipment moves to a state where its items are now counted as in-transit. */
export async function markItemsInTransit(
  items: Array<{
    productId: string
    variantId: string
    quantity: number
    sku: string
  }>,
  shipmentReference: string,
  actorId: string
): Promise<void> {
  for (const item of items) {
    await applyMovement({
      productId: item.productId,
      variantId: item.variantId,
      field: "quantityInTransit",
      type: "stockIn",
      actorId,
      reason: null,
      reference: shipmentReference,
      computeDelta: () => item.quantity,
      createDefaults: { sku: item.sku, reorderThreshold: 0 },
    })
  }
}
