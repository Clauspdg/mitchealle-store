import "server-only"
import { FieldValue, Timestamp } from "firebase-admin/firestore"

import { adminDb } from "@/firebase/admin"
import { decodeCursor, encodeCursor } from "@/utils/pagination"
import {
  markItemsInTransit,
  receiveShipmentLineItem,
} from "@/services/firestore/inventory"
import type {
  IncomingShipmentFormInput,
  ReceiveShipmentInput,
  SetShipmentStatusInput,
  ShipmentSearchParams,
} from "@/schemas/incoming-shipment.schema"
import type { CursorPage } from "@/types/pagination"
import type {
  IncomingShipment,
  IncomingShipmentDocument,
  ShipmentStatus,
} from "@/types/incoming-shipment"

const SHIPMENTS_COLLECTION = "incomingShipments"
const COUNTERS_COLLECTION = "counters"
const PAGE_SIZE = 20

function toShipment(
  id: string,
  data: FirebaseFirestore.DocumentData
): IncomingShipment {
  return { id, ...(data as IncomingShipmentDocument) }
}

async function nextShipmentReference(): Promise<string> {
  const counterRef = adminDb
    .collection(COUNTERS_COLLECTION)
    .doc("incomingShipments")
  const year = new Date().getFullYear()

  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(counterRef)
    const seq = ((snap.data()?.seq as number | undefined) ?? 0) + 1
    tx.set(counterRef, { seq }, { merge: true })
    return `PO-${year}-${String(seq).padStart(4, "0")}`
  })
}

export async function getShipment(
  id: string
): Promise<IncomingShipment | null> {
  const doc = await adminDb.collection(SHIPMENTS_COLLECTION).doc(id).get()
  return doc.exists ? toShipment(doc.id, doc.data()!) : null
}

interface CursorPayload {
  sortValue: unknown
  id: string
}

export async function listShipments(
  params: ShipmentSearchParams
): Promise<CursorPage<IncomingShipment>> {
  let query: FirebaseFirestore.Query = adminDb.collection(SHIPMENTS_COLLECTION)

  if (params.status !== "all") {
    query = query.where("status", "==", params.status)
  }
  if (params.supplierId) {
    query = query.where("supplierId", "==", params.supplierId)
  }

  let paged = query
    .orderBy("expectedAt", "asc")
    .orderBy("__name__", "asc")
    .limit(PAGE_SIZE + 1)

  if (params.cursor) {
    const decoded = decodeCursor<CursorPayload>(params.cursor)
    paged = paged.startAfter(decoded.sortValue, decoded.id)
  }

  const snapshot = await paged.get()
  const docs = snapshot.docs.slice(0, PAGE_SIZE)
  const hasMore = snapshot.docs.length > PAGE_SIZE
  const items = docs.map((doc) => toShipment(doc.id, doc.data()))

  const lastDoc = docs.at(-1)
  const nextCursor =
    hasMore && lastDoc
      ? encodeCursor({
          sortValue: lastDoc.get("expectedAt") ?? null,
          id: lastDoc.id,
        } satisfies CursorPayload)
      : null

  return { items, nextCursor, hasMore }
}

export async function listShipmentsForSupplier(
  supplierId: string
): Promise<IncomingShipment[]> {
  const snapshot = await adminDb
    .collection(SHIPMENTS_COLLECTION)
    .where("supplierId", "==", supplierId)
    .orderBy("orderedAt", "desc")
    .get()
  return snapshot.docs.map((doc) => toShipment(doc.id, doc.data()))
}

/** Overdue = still active and past its ETA. Bounded query, see docs/firestore-architecture.md §11. */
export async function listOverdueShipments(
  limit = 20
): Promise<IncomingShipment[]> {
  const now = Timestamp.now()
  const snapshot = await adminDb
    .collection(SHIPMENTS_COLLECTION)
    .where("status", "in", [
      "planned",
      "preparing",
      "shipped",
      "inTransit",
      "arrived",
      "partiallyReceived",
    ])
    .where("expectedAt", "<", now)
    .orderBy("expectedAt", "asc")
    .limit(limit)
    .get()
  return snapshot.docs.map((doc) => toShipment(doc.id, doc.data()))
}

/** Recently received = "ready to sell" signal, see docs/firestore-architecture.md §11. */
export async function listRecentlyReceivedShipments(
  sinceDays = 7,
  limit = 20
): Promise<IncomingShipment[]> {
  const since = Timestamp.fromMillis(
    Date.now() - sinceDays * 24 * 60 * 60 * 1000
  )
  const snapshot = await adminDb
    .collection(SHIPMENTS_COLLECTION)
    .where("status", "==", "received")
    .where("receivedAt", ">=", since)
    .orderBy("receivedAt", "desc")
    .limit(limit)
    .get()
  return snapshot.docs.map((doc) => toShipment(doc.id, doc.data()))
}

export async function countUpcomingShipments(): Promise<number> {
  const snapshot = await adminDb
    .collection(SHIPMENTS_COLLECTION)
    .where("status", "in", ["planned", "preparing", "shipped", "inTransit"])
    .count()
    .get()
  return snapshot.data().count
}

export async function createShipment(
  input: IncomingShipmentFormInput,
  actorUid: string
): Promise<IncomingShipment> {
  const reference = await nextShipmentReference()
  const now = FieldValue.serverTimestamp()
  const totalCostMinor = input.items.reduce(
    (sum, item) => sum + item.quantityOrdered * item.unitCostMinor,
    0
  )

  const docData = {
    supplierId: input.supplierId,
    reference,
    status: "planned" as ShipmentStatus,
    trackingNumber: input.trackingNumber,
    carrier: input.carrier,
    items: input.items.map((item) => ({ ...item, quantityReceived: 0 })),
    currency: input.currency,
    totalCostMinor,
    orderedAt: Timestamp.fromDate(input.orderedAt),
    expectedAt: input.expectedAt ? Timestamp.fromDate(input.expectedAt) : null,
    receivedAt: null,
    notes: input.notes,
    createdBy: actorUid,
    createdAt: now,
    updatedAt: now,
  }

  const ref = await adminDb.collection(SHIPMENTS_COLLECTION).add(docData)
  const created = await ref.get()
  return toShipment(created.id, created.data()!)
}

export async function updateShipment(
  id: string,
  input: IncomingShipmentFormInput
): Promise<IncomingShipment> {
  const totalCostMinor = input.items.reduce(
    (sum, item) => sum + item.quantityOrdered * item.unitCostMinor,
    0
  )

  const current = await getShipment(id)
  if (!current) throw new Error(`Shipment ${id} not found`)

  await adminDb
    .collection(SHIPMENTS_COLLECTION)
    .doc(id)
    .update({
      supplierId: input.supplierId,
      trackingNumber: input.trackingNumber,
      carrier: input.carrier,
      items: input.items.map((item) => {
        const existing = current.items.find(
          (i) =>
            i.productId === item.productId && i.variantId === item.variantId
        )
        return { ...item, quantityReceived: existing?.quantityReceived ?? 0 }
      }),
      currency: input.currency,
      totalCostMinor,
      orderedAt: Timestamp.fromDate(input.orderedAt),
      expectedAt: input.expectedAt
        ? Timestamp.fromDate(input.expectedAt)
        : null,
      notes: input.notes,
      updatedAt: FieldValue.serverTimestamp(),
    })

  return (await getShipment(id))!
}

export async function setShipmentStatus(
  input: SetShipmentStatusInput,
  actorUid: string
): Promise<IncomingShipment> {
  const current = await getShipment(input.shipmentId)
  if (!current) throw new Error(`Shipment ${input.shipmentId} not found`)

  const wasInTransitOrLater = [
    "inTransit",
    "arrived",
    "partiallyReceived",
    "received",
  ].includes(current.status)

  await adminDb.collection(SHIPMENTS_COLLECTION).doc(input.shipmentId).update({
    status: input.status,
    updatedAt: FieldValue.serverTimestamp(),
  })

  // Mark items as in-transit inventory the first time the shipment
  // reaches "inTransit" — never repeated on later transitions.
  if (input.status === "inTransit" && !wasInTransitOrLater) {
    await markItemsInTransit(
      current.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantityOrdered,
        sku: "",
      })),
      current.reference,
      actorUid
    )
  }

  return (await getShipment(input.shipmentId))!
}

/**
 * Receives some or all items of a shipment. Updates inventory
 * (transactionally, per item, via services/firestore/inventory.ts),
 * the shipment's `items[].quantityReceived`, and its overall `status`
 * (`received` if every line is fully received, `partiallyReceived`
 * otherwise) — see docs/firestore-architecture.md §5.2.
 */
export async function receiveShipment(
  input: ReceiveShipmentInput,
  actorUid: string
): Promise<IncomingShipment> {
  const shipment = await getShipment(input.shipmentId)
  if (!shipment) throw new Error(`Shipment ${input.shipmentId} not found`)

  for (const receivedItem of input.items) {
    if (receivedItem.quantityReceivedNow <= 0) continue
    await receiveShipmentLineItem(
      {
        productId: receivedItem.productId,
        variantId: receivedItem.variantId,
        quantityReceivedNow: receivedItem.quantityReceivedNow,
        shipmentReference: shipment.reference,
        sku: "",
      },
      actorUid
    )
  }

  const updatedItems = shipment.items.map((item) => {
    const received = input.items.find(
      (i) => i.productId === item.productId && i.variantId === item.variantId
    )
    return received
      ? {
          ...item,
          quantityReceived: Math.min(
            item.quantityOrdered,
            item.quantityReceived + received.quantityReceivedNow
          ),
        }
      : item
  })

  const fullyReceived = updatedItems.every(
    (item) => item.quantityReceived >= item.quantityOrdered
  )
  const anyReceived = updatedItems.some((item) => item.quantityReceived > 0)
  const nextStatus: ShipmentStatus = fullyReceived
    ? "received"
    : anyReceived
      ? "partiallyReceived"
      : shipment.status

  await adminDb
    .collection(SHIPMENTS_COLLECTION)
    .doc(input.shipmentId)
    .update({
      items: updatedItems,
      status: nextStatus,
      receivedAt: fullyReceived
        ? FieldValue.serverTimestamp()
        : shipment.receivedAt,
      updatedAt: FieldValue.serverTimestamp(),
    })

  return (await getShipment(input.shipmentId))!
}
