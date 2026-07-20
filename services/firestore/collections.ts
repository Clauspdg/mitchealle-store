import "server-only"
import { FieldValue, Timestamp } from "firebase-admin/firestore"

import { adminDb } from "@/firebase/admin"
import { generateUniqueSlug } from "@/validators/slug.validator"
import { isMissingIndexError } from "@/utils/firestore-errors"
import type { CollectionFormInput } from "@/schemas/collection.schema"
import type {
  Collection,
  CollectionDocument,
  CollectionStatus,
} from "@/types/collection"

const COLLECTIONS_COLLECTION = "collections"
const PRODUCTS_COLLECTION = "products"

function toCollection(
  id: string,
  data: FirebaseFirestore.DocumentData
): Collection {
  return { id, ...(data as CollectionDocument) }
}

export async function collectionSlugExists(
  slug: string,
  excludeId?: string
): Promise<boolean> {
  const snapshot = await adminDb
    .collection(COLLECTIONS_COLLECTION)
    .where("slug", "==", slug)
    .limit(2)
    .get()

  return snapshot.docs.some((doc) => doc.id !== excludeId)
}

export async function listCollections(options?: {
  activeOnly?: boolean
}): Promise<Collection[]> {
  let query: FirebaseFirestore.Query = adminDb
    .collection(COLLECTIONS_COLLECTION)
    .orderBy("position", "asc")

  if (options?.activeOnly) {
    query = query.where("status", "==", "active")
  }

  try {
    const snapshot = await query.get()
    return snapshot.docs.map((doc) => toCollection(doc.id, doc.data()))
  } catch (error) {
    if (isMissingIndexError(error)) {
      console.error(
        "[listCollections] Firestore composite index missing — returning an empty list instead of crashing. Deploy indexes: firebase deploy --only firestore:indexes",
        error
      )
      return []
    }
    throw error
  }
}

export async function getCollection(id: string): Promise<Collection | null> {
  const doc = await adminDb.collection(COLLECTIONS_COLLECTION).doc(id).get()
  return doc.exists ? toCollection(doc.id, doc.data()!) : null
}

/**
 * Storefront-safe lookup by slug — always forces `status == "active"` so a
 * customer can never load a draft/archived collection by guessing its slug.
 */
export async function getCollectionBySlug(
  slug: string
): Promise<Collection | null> {
  const snapshot = await adminDb
    .collection(COLLECTIONS_COLLECTION)
    .where("slug", "==", slug)
    .where("status", "==", "active")
    .limit(1)
    .get()

  return snapshot.empty
    ? null
    : toCollection(snapshot.docs[0].id, snapshot.docs[0].data())
}

function toTimestampOrNull(date: Date | null): Timestamp | null {
  return date ? Timestamp.fromDate(date) : null
}

export async function createCollection(
  input: CollectionFormInput,
  actorUid: string
): Promise<Collection> {
  const slug = await generateUniqueSlug(input.name, collectionSlugExists)
  const now = FieldValue.serverTimestamp()

  const docData = {
    name: input.name,
    nameLower: input.name.toLowerCase(),
    slug,
    description: input.description,
    coverImageUrl: input.coverImageUrl,
    bannerImageUrl: input.bannerImageUrl,
    primaryColor: input.primaryColor,
    type: input.type,
    productIds: input.productIds,
    rules: null,
    startAt: toTimestampOrNull(input.startAt),
    endAt: toTimestampOrNull(input.endAt),
    status: input.status,
    position: input.position,
    seo: input.seo,
    createdBy: actorUid,
    createdAt: now,
    updatedAt: now,
  }

  const ref = await adminDb.collection(COLLECTIONS_COLLECTION).add(docData)

  if (input.productIds.length > 0) {
    await syncProductMembership(ref.id, [], input.productIds)
  }

  const created = await ref.get()
  return toCollection(created.id, created.data()!)
}

export async function updateCollection(
  id: string,
  input: CollectionFormInput
): Promise<Collection> {
  const current = await getCollection(id)
  if (!current) {
    throw new Error(`Collection ${id} not found`)
  }

  const slug =
    input.name === current.name
      ? current.slug
      : await generateUniqueSlug(input.name, collectionSlugExists, current.slug)

  await adminDb
    .collection(COLLECTIONS_COLLECTION)
    .doc(id)
    .update({
      name: input.name,
      nameLower: input.name.toLowerCase(),
      slug,
      description: input.description,
      coverImageUrl: input.coverImageUrl,
      bannerImageUrl: input.bannerImageUrl,
      primaryColor: input.primaryColor,
      type: input.type,
      productIds: input.productIds,
      startAt: toTimestampOrNull(input.startAt),
      endAt: toTimestampOrNull(input.endAt),
      status: input.status,
      position: input.position,
      seo: input.seo,
      updatedAt: FieldValue.serverTimestamp(),
    })

  const previousIds = current.productIds ?? []
  const nextIds = input.productIds
  if (
    previousIds.length !== nextIds.length ||
    !previousIds.every((productId) => nextIds.includes(productId))
  ) {
    await syncProductMembership(id, previousIds, nextIds)
  }

  return (await getCollection(id))!
}

export async function setCollectionStatus(
  id: string,
  status: CollectionStatus
): Promise<void> {
  await adminDb.collection(COLLECTIONS_COLLECTION).doc(id).update({
    status,
    updatedAt: FieldValue.serverTimestamp(),
  })
}

export async function reorderCollections(orderedIds: string[]): Promise<void> {
  const batch = adminDb.batch()
  orderedIds.forEach((id, index) => {
    batch.update(adminDb.collection(COLLECTIONS_COLLECTION).doc(id), {
      position: index,
      updatedAt: FieldValue.serverTimestamp(),
    })
  })
  await batch.commit()
}

/**
 * Keeps `collections.productIds` and each product's `collectionIds` in
 * sync in a single WriteBatch — see docs/firestore-architecture.md §9
 * ("Synchronisation products.collectionIds ↔ collections.productIds").
 */
async function syncProductMembership(
  collectionId: string,
  previousProductIds: string[],
  nextProductIds: string[]
): Promise<void> {
  const added = nextProductIds.filter((id) => !previousProductIds.includes(id))
  const removed = previousProductIds.filter(
    (id) => !nextProductIds.includes(id)
  )

  if (added.length === 0 && removed.length === 0) return

  const batch = adminDb.batch()

  added.forEach((productId) => {
    batch.update(adminDb.collection(PRODUCTS_COLLECTION).doc(productId), {
      collectionIds: FieldValue.arrayUnion(collectionId),
      updatedAt: FieldValue.serverTimestamp(),
    })
  })

  removed.forEach((productId) => {
    batch.update(adminDb.collection(PRODUCTS_COLLECTION).doc(productId), {
      collectionIds: FieldValue.arrayRemove(collectionId),
      updatedAt: FieldValue.serverTimestamp(),
    })
  })

  await batch.commit()
}
