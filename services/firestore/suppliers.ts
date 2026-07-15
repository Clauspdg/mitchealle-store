import "server-only"
import { FieldValue } from "firebase-admin/firestore"

import { adminDb } from "@/firebase/admin"
import { decodeCursor, encodeCursor } from "@/utils/pagination"
import type { SupplierFormInput } from "@/schemas/supplier.schema"
import type { CursorPage } from "@/types/pagination"
import type { Supplier, SupplierDocument } from "@/types/supplier"

const SUPPLIERS_COLLECTION = "suppliers"
const PAGE_SIZE = 20

function toSupplier(
  id: string,
  data: FirebaseFirestore.DocumentData
): Supplier {
  return { id, ...(data as SupplierDocument) }
}

export async function getSupplier(id: string): Promise<Supplier | null> {
  const doc = await adminDb.collection(SUPPLIERS_COLLECTION).doc(id).get()
  return doc.exists ? toSupplier(doc.id, doc.data()!) : null
}

export async function listAllSuppliers(): Promise<Supplier[]> {
  const snapshot = await adminDb
    .collection(SUPPLIERS_COLLECTION)
    .orderBy("name", "asc")
    .get()
  return snapshot.docs.map((doc) => toSupplier(doc.id, doc.data()))
}

interface CursorPayload {
  sortValue: unknown
  id: string
}

export async function listSuppliers(params: {
  activeOnly?: boolean
  cursor?: string | null
}): Promise<CursorPage<Supplier>> {
  let query: FirebaseFirestore.Query = adminDb.collection(SUPPLIERS_COLLECTION)

  if (params.activeOnly) {
    query = query.where("isActive", "==", true)
  }

  let paged = query
    .orderBy("name", "asc")
    .orderBy("__name__", "asc")
    .limit(PAGE_SIZE + 1)
  if (params.cursor) {
    const decoded = decodeCursor<CursorPayload>(params.cursor)
    paged = paged.startAfter(decoded.sortValue, decoded.id)
  }

  const snapshot = await paged.get()
  const docs = snapshot.docs.slice(0, PAGE_SIZE)
  const hasMore = snapshot.docs.length > PAGE_SIZE
  const items = docs.map((doc) => toSupplier(doc.id, doc.data()))

  const lastDoc = docs.at(-1)
  const nextCursor =
    hasMore && lastDoc
      ? encodeCursor({
          sortValue: lastDoc.get("name") ?? null,
          id: lastDoc.id,
        } satisfies CursorPayload)
      : null

  return { items, nextCursor, hasMore }
}

export async function createSupplier(
  input: SupplierFormInput
): Promise<Supplier> {
  const now = FieldValue.serverTimestamp()
  const ref = await adminDb.collection(SUPPLIERS_COLLECTION).add({
    ...input,
    createdAt: now,
    updatedAt: now,
  })
  const created = await ref.get()
  return toSupplier(created.id, created.data()!)
}

export async function updateSupplier(
  id: string,
  input: SupplierFormInput
): Promise<Supplier> {
  await adminDb
    .collection(SUPPLIERS_COLLECTION)
    .doc(id)
    .update({ ...input, updatedAt: FieldValue.serverTimestamp() })
  return (await getSupplier(id))!
}

export async function setSupplierActive(
  id: string,
  isActive: boolean
): Promise<void> {
  await adminDb.collection(SUPPLIERS_COLLECTION).doc(id).update({
    isActive,
    updatedAt: FieldValue.serverTimestamp(),
  })
}
