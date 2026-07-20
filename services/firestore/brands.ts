import "server-only"
import { FieldValue } from "firebase-admin/firestore"

import { adminDb } from "@/firebase/admin"
import { generateUniqueSlug } from "@/validators/slug.validator"
import { isMissingIndexError } from "@/utils/firestore-errors"
import type { BrandFormInput } from "@/schemas/brand.schema"
import type { Brand, BrandDocument } from "@/types/brand"

const BRANDS_COLLECTION = "brands"

function toBrand(id: string, data: FirebaseFirestore.DocumentData): Brand {
  return { id, ...(data as BrandDocument) }
}

export async function brandSlugExists(
  slug: string,
  excludeId?: string
): Promise<boolean> {
  const snapshot = await adminDb
    .collection(BRANDS_COLLECTION)
    .where("slug", "==", slug)
    .limit(2)
    .get()
  return snapshot.docs.some((doc) => doc.id !== excludeId)
}

export async function listBrands(options?: {
  activeOnly?: boolean
}): Promise<Brand[]> {
  let query: FirebaseFirestore.Query = adminDb
    .collection(BRANDS_COLLECTION)
    .orderBy("position", "asc")

  if (options?.activeOnly) {
    query = query.where("isActive", "==", true)
  }

  try {
    const snapshot = await query.get()
    return snapshot.docs.map((doc) => toBrand(doc.id, doc.data()))
  } catch (error) {
    if (isMissingIndexError(error)) {
      console.error(
        "[listBrands] Firestore composite index missing — returning an empty list instead of crashing. Deploy indexes: firebase deploy --only firestore:indexes",
        error
      )
      return []
    }
    throw error
  }
}

export async function getBrand(id: string): Promise<Brand | null> {
  const doc = await adminDb.collection(BRANDS_COLLECTION).doc(id).get()
  return doc.exists ? toBrand(doc.id, doc.data()!) : null
}

export async function createBrand(input: BrandFormInput): Promise<Brand> {
  const slug = await generateUniqueSlug(input.name, brandSlugExists)
  const now = FieldValue.serverTimestamp()

  const docData = {
    name: input.name,
    nameLower: input.name.toLowerCase(),
    slug,
    logoUrl: input.logoUrl,
    description: input.description,
    country: input.country,
    websiteUrl: input.websiteUrl,
    isActive: input.isActive,
    position: input.position,
    createdAt: now,
    updatedAt: now,
  }

  const ref = await adminDb.collection(BRANDS_COLLECTION).add(docData)
  const created = await ref.get()
  return toBrand(created.id, created.data()!)
}

export async function updateBrand(
  id: string,
  input: BrandFormInput
): Promise<Brand> {
  const current = await getBrand(id)
  if (!current) {
    throw new Error(`Brand ${id} not found`)
  }

  const slug =
    input.name === current.name
      ? current.slug
      : await generateUniqueSlug(input.name, brandSlugExists, current.slug)

  await adminDb.collection(BRANDS_COLLECTION).doc(id).update({
    name: input.name,
    nameLower: input.name.toLowerCase(),
    slug,
    logoUrl: input.logoUrl,
    description: input.description,
    country: input.country,
    websiteUrl: input.websiteUrl,
    isActive: input.isActive,
    position: input.position,
    updatedAt: FieldValue.serverTimestamp(),
  })

  return (await getBrand(id))!
}

export async function setBrandActive(
  id: string,
  isActive: boolean
): Promise<void> {
  await adminDb.collection(BRANDS_COLLECTION).doc(id).update({
    isActive,
    updatedAt: FieldValue.serverTimestamp(),
  })
}

export async function reorderBrands(orderedIds: string[]): Promise<void> {
  const batch = adminDb.batch()
  orderedIds.forEach((id, index) => {
    batch.update(adminDb.collection(BRANDS_COLLECTION).doc(id), {
      position: index,
      updatedAt: FieldValue.serverTimestamp(),
    })
  })
  await batch.commit()
}
