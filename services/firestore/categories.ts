import "server-only"
import { FieldValue } from "firebase-admin/firestore"

import { adminDb } from "@/firebase/admin"
import { generateUniqueSlug } from "@/validators/slug.validator"
import { isMissingIndexError } from "@/utils/firestore-errors"
import type { CategoryFormInput } from "@/schemas/category.schema"
import type { Category, CategoryDocument } from "@/types/category"

const CATEGORIES_COLLECTION = "categories"

function toCategory(
  id: string,
  data: FirebaseFirestore.DocumentData
): Category {
  return { id, ...(data as CategoryDocument) }
}

export async function categorySlugExists(
  slug: string,
  excludeId?: string
): Promise<boolean> {
  const snapshot = await adminDb
    .collection(CATEGORIES_COLLECTION)
    .where("slug", "==", slug)
    .limit(2)
    .get()

  return snapshot.docs.some((doc) => doc.id !== excludeId)
}

export async function listCategories(options?: {
  activeOnly?: boolean
}): Promise<Category[]> {
  let query: FirebaseFirestore.Query = adminDb
    .collection(CATEGORIES_COLLECTION)
    .orderBy("position", "asc")

  if (options?.activeOnly) {
    query = query.where("isActive", "==", true)
  }

  try {
    const snapshot = await query.get()
    return snapshot.docs.map((doc) => toCategory(doc.id, doc.data()))
  } catch (error) {
    if (isMissingIndexError(error)) {
      console.error(
        "[listCategories] Firestore composite index missing — returning an empty list instead of crashing. Deploy indexes: firebase deploy --only firestore:indexes",
        error
      )
      return []
    }
    throw error
  }
}

export async function getCategory(id: string): Promise<Category | null> {
  const doc = await adminDb.collection(CATEGORIES_COLLECTION).doc(id).get()
  return doc.exists ? toCategory(doc.id, doc.data()!) : null
}

/**
 * Storefront-safe lookup by slug — always forces `isActive == true` so a
 * customer can never load an inactive category by guessing its slug.
 */
export async function getCategoryBySlug(
  slug: string
): Promise<Category | null> {
  const snapshot = await adminDb
    .collection(CATEGORIES_COLLECTION)
    .where("slug", "==", slug)
    .where("isActive", "==", true)
    .limit(1)
    .get()

  return snapshot.empty
    ? null
    : toCategory(snapshot.docs[0].id, snapshot.docs[0].data())
}

export async function createCategory(
  input: CategoryFormInput,
  actorUid: string
): Promise<Category> {
  const slug = await generateUniqueSlug(input.name, categorySlugExists)
  const now = FieldValue.serverTimestamp()

  const docData = {
    name: input.name,
    nameLower: input.name.toLowerCase(),
    slug,
    description: input.description,
    icon: input.icon,
    imageUrl: input.imageUrl,
    parentId: input.parentId,
    position: input.position,
    isActive: input.isActive,
    seo: input.seo,
    createdAt: now,
    updatedAt: now,
  }

  const ref = await adminDb.collection(CATEGORIES_COLLECTION).add(docData)
  void actorUid // reserved for audit logging once the admin panel lands
  const created = await ref.get()
  return toCategory(created.id, created.data()!)
}

export async function updateCategory(
  id: string,
  input: CategoryFormInput
): Promise<Category> {
  const current = await getCategory(id)
  if (!current) {
    throw new Error(`Category ${id} not found`)
  }

  const slug =
    input.name === current.name
      ? current.slug
      : await generateUniqueSlug(input.name, categorySlugExists, current.slug)

  await adminDb.collection(CATEGORIES_COLLECTION).doc(id).update({
    name: input.name,
    nameLower: input.name.toLowerCase(),
    slug,
    description: input.description,
    icon: input.icon,
    imageUrl: input.imageUrl,
    parentId: input.parentId,
    position: input.position,
    isActive: input.isActive,
    seo: input.seo,
    updatedAt: FieldValue.serverTimestamp(),
  })

  return (await getCategory(id))!
}

export async function setCategoryActive(
  id: string,
  isActive: boolean
): Promise<void> {
  await adminDb.collection(CATEGORIES_COLLECTION).doc(id).update({
    isActive,
    updatedAt: FieldValue.serverTimestamp(),
  })
}

export async function reorderCategories(orderedIds: string[]): Promise<void> {
  const batch = adminDb.batch()
  orderedIds.forEach((id, index) => {
    batch.update(adminDb.collection(CATEGORIES_COLLECTION).doc(id), {
      position: index,
      updatedAt: FieldValue.serverTimestamp(),
    })
  })
  await batch.commit()
}
