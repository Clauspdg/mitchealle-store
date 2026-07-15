import "server-only"
import { FieldValue, Timestamp } from "firebase-admin/firestore"

import { adminDb } from "@/firebase/admin"
import { generateUniqueSlug } from "@/validators/slug.validator"
import { encodeCursor, decodeCursor } from "@/utils/pagination"
import type {
  ProductFormInput,
  ProductSearchParams,
} from "@/schemas/product.schema"
import type { CursorPage } from "@/types/pagination"
import type { Product, ProductDocument, ProductStatus } from "@/types/product"

const PRODUCTS_COLLECTION = "products"
const COLLECTIONS_COLLECTION = "collections"
const PAGE_SIZE = 20
const CSV_EXPORT_LIMIT = 1000
// Highest possible Unicode code point — the standard Firestore trick for a
// prefix range query: `[term, term + PREFIX_RANGE_END)`.
const PREFIX_RANGE_END = String.fromCodePoint(0xf8ff)

function toProduct(id: string, data: FirebaseFirestore.DocumentData): Product {
  return { id, ...(data as ProductDocument) }
}

function toTimestampOrNull(date: Date | null): Timestamp | null {
  return date ? Timestamp.fromDate(date) : null
}

export async function productSlugExists(
  slug: string,
  excludeId?: string
): Promise<boolean> {
  const snapshot = await adminDb
    .collection(PRODUCTS_COLLECTION)
    .where("slug", "==", slug)
    .limit(2)
    .get()

  return snapshot.docs.some((doc) => doc.id !== excludeId)
}

export async function getProduct(id: string): Promise<Product | null> {
  const doc = await adminDb.collection(PRODUCTS_COLLECTION).doc(id).get()
  return doc.exists ? toProduct(doc.id, doc.data()!) : null
}

/**
 * Unpaginated, bounded fetch for picker UIs (shipment items, inventory
 * search) that need the whole catalog at once rather than a page at a
 * time. Capped at 200 — reasonable for a small/mid catalog; revisit with a
 * real search-as-you-type picker if the catalog outgrows this.
 */
export async function listAllProducts(limit = 200): Promise<Product[]> {
  const snapshot = await adminDb
    .collection(PRODUCTS_COLLECTION)
    .where("status", "!=", "archived")
    .limit(limit)
    .get()
  return snapshot.docs.map((doc) => toProduct(doc.id, doc.data()))
}

function buildDocData(input: ProductFormInput) {
  return {
    name: input.name,
    nameLower: input.name.toLowerCase(),
    shortDescription: input.shortDescription,
    description: input.description,
    sku: input.sku,
    brand: input.brand,
    categoryId: input.categoryId,
    collectionIds: input.collectionIds,
    images: input.images,
    basePriceMinor: input.basePriceMinor,
    salePriceMinor: input.salePriceMinor,
    currency: input.currency,
    variants: input.variants,
    tags: input.tags,
    status: input.status,
    isComingSoon: input.isComingSoon,
    isPreorderable: input.isPreorderable,
    preorderMessage: input.preorderMessage,
    availableFrom: toTimestampOrNull(input.availableFrom),
    seo: input.seo,
  }
}

export async function createProduct(
  input: ProductFormInput,
  actorUid: string
): Promise<Product> {
  const slug = await generateUniqueSlug(input.name, productSlugExists)
  const now = FieldValue.serverTimestamp()

  const docData = {
    ...buildDocData(input),
    slug,
    // Not exposed in the Sprint 2A form — see docs/firestore-architecture.md
    // §2.3 note. Reserved for a future fixed-window preorder campaign.
    preorderWindow: null,
    ratingAverage: 0,
    ratingCount: 0,
    createdAt: now,
    updatedAt: now,
    createdBy: actorUid,
  }

  const ref = await adminDb.collection(PRODUCTS_COLLECTION).add(docData)

  if (input.collectionIds.length > 0) {
    await syncCollectionMembership(ref.id, [], input.collectionIds)
  }

  const created = await ref.get()
  return toProduct(created.id, created.data()!)
}

export async function updateProduct(
  id: string,
  input: ProductFormInput
): Promise<Product> {
  const current = await getProduct(id)
  if (!current) {
    throw new Error(`Product ${id} not found`)
  }

  const slug =
    input.name === current.name
      ? current.slug
      : await generateUniqueSlug(input.name, productSlugExists, current.slug)

  await adminDb
    .collection(PRODUCTS_COLLECTION)
    .doc(id)
    .update({
      ...buildDocData(input),
      slug,
      updatedAt: FieldValue.serverTimestamp(),
    })

  const previousIds = current.collectionIds
  const nextIds = input.collectionIds
  if (
    previousIds.length !== nextIds.length ||
    !previousIds.every((collectionId) => nextIds.includes(collectionId))
  ) {
    await syncCollectionMembership(id, previousIds, nextIds)
  }

  return (await getProduct(id))!
}

/**
 * Mirror of `services/firestore/collections.ts`'s `syncProductMembership`,
 * from the product side — see docs/firestore-architecture.md §9.
 */
async function syncCollectionMembership(
  productId: string,
  previousCollectionIds: string[],
  nextCollectionIds: string[]
): Promise<void> {
  const added = nextCollectionIds.filter(
    (id) => !previousCollectionIds.includes(id)
  )
  const removed = previousCollectionIds.filter(
    (id) => !nextCollectionIds.includes(id)
  )

  if (added.length === 0 && removed.length === 0) return

  const batch = adminDb.batch()

  added.forEach((collectionId) => {
    batch.update(adminDb.collection(COLLECTIONS_COLLECTION).doc(collectionId), {
      productIds: FieldValue.arrayUnion(productId),
      updatedAt: FieldValue.serverTimestamp(),
    })
  })

  removed.forEach((collectionId) => {
    batch.update(adminDb.collection(COLLECTIONS_COLLECTION).doc(collectionId), {
      productIds: FieldValue.arrayRemove(productId),
      updatedAt: FieldValue.serverTimestamp(),
    })
  })

  await batch.commit()
}

// --- Status transitions (no physical delete — see docs/firestore-architecture.md §5.1) ---

async function setStatus(id: string, status: ProductStatus): Promise<void> {
  await adminDb.collection(PRODUCTS_COLLECTION).doc(id).update({
    status,
    updatedAt: FieldValue.serverTimestamp(),
  })
}

export const publishProduct = (id: string) => setStatus(id, "published")
export const unpublishProduct = (id: string) => setStatus(id, "draft")
export const archiveProduct = (id: string) => setStatus(id, "archived")
export const restoreProduct = (id: string) => setStatus(id, "draft")

// --- Listing: search, filter, sort, cursor pagination ---

interface SortSpec {
  field: string
  direction: FirebaseFirestore.OrderByDirection
}

function sortSpecFor(sort: ProductSearchParams["sort"]): SortSpec {
  switch (sort) {
    case "createdAt_asc":
      return { field: "createdAt", direction: "asc" }
    case "name_asc":
      return { field: "nameLower", direction: "asc" }
    case "name_desc":
      return { field: "nameLower", direction: "desc" }
    case "price_asc":
      return { field: "basePriceMinor", direction: "asc" }
    case "price_desc":
      return { field: "basePriceMinor", direction: "desc" }
    case "createdAt_desc":
    default:
      return { field: "createdAt", direction: "desc" }
  }
}

interface CursorPayload {
  sortValue: unknown
  id: string
}

function buildProductsQuery(
  params: Pick<
    ProductSearchParams,
    "q" | "status" | "categoryId" | "collectionId" | "sort"
  >
): { query: FirebaseFirestore.Query; sort: SortSpec; searching: boolean } {
  let query: FirebaseFirestore.Query = adminDb.collection(PRODUCTS_COLLECTION)
  const searching = params.q.trim().length > 0

  if (params.status !== "all") {
    query = query.where("status", "==", params.status)
  }
  if (params.categoryId) {
    query = query.where("categoryId", "==", params.categoryId)
  }
  if (params.collectionId) {
    query = query.where("collectionIds", "array-contains", params.collectionId)
  }

  if (searching) {
    const term = params.q.trim().toLowerCase()
    query = query
      .where("nameLower", ">=", term)
      .where("nameLower", "<=", term + PREFIX_RANGE_END)
      .orderBy("nameLower", "asc")
    return { query, sort: { field: "nameLower", direction: "asc" }, searching }
  }

  const sort = sortSpecFor(params.sort)
  query = query.orderBy(sort.field, sort.direction)
  return { query, sort, searching }
}

export async function listProducts(
  params: ProductSearchParams
): Promise<CursorPage<Product>> {
  const { query, sort } = buildProductsQuery(params)

  let paged = query.orderBy("__name__", sort.direction).limit(PAGE_SIZE + 1)

  if (params.cursor) {
    const decoded = decodeCursor<CursorPayload>(params.cursor)
    paged = paged.startAfter(decoded.sortValue, decoded.id)
  }

  const snapshot = await paged.get()
  const docs = snapshot.docs.slice(0, PAGE_SIZE)
  const hasMore = snapshot.docs.length > PAGE_SIZE

  const items = docs.map((doc) => toProduct(doc.id, doc.data()))

  const lastDoc = docs.at(-1)
  const nextCursor =
    hasMore && lastDoc
      ? encodeCursor({
          sortValue: lastDoc.get(sort.field) ?? null,
          id: lastDoc.id,
        } satisfies CursorPayload)
      : null

  return { items, nextCursor, hasMore }
}

export async function countProductsByStatus(): Promise<
  Record<ProductStatus | "all", number>
> {
  const [all, draft, published, archived] = await Promise.all([
    adminDb.collection(PRODUCTS_COLLECTION).count().get(),
    adminDb
      .collection(PRODUCTS_COLLECTION)
      .where("status", "==", "draft")
      .count()
      .get(),
    adminDb
      .collection(PRODUCTS_COLLECTION)
      .where("status", "==", "published")
      .count()
      .get(),
    adminDb
      .collection(PRODUCTS_COLLECTION)
      .where("status", "==", "archived")
      .count()
      .get(),
  ])

  return {
    all: all.data().count,
    draft: draft.data().count,
    published: published.data().count,
    archived: archived.data().count,
  }
}

/**
 * Exports up to `CSV_EXPORT_LIMIT` matching products as CSV rows — reuses
 * the same filters as the admin table (see
 * docs/firestore-architecture.md §9, "Export CSV").
 */
export async function exportProductsToCsv(
  params: Pick<
    ProductSearchParams,
    "q" | "status" | "categoryId" | "collectionId" | "sort"
  >
): Promise<string> {
  const { query, sort } = buildProductsQuery(params)
  const snapshot = await query
    .orderBy("__name__", sort.direction)
    .limit(CSV_EXPORT_LIMIT)
    .get()

  const header = [
    "id",
    "name",
    "sku",
    "status",
    "categoryId",
    "basePriceMinor",
    "salePriceMinor",
    "currency",
    "createdAt",
  ]

  const rows = snapshot.docs.map((doc) => {
    const data = toProduct(doc.id, doc.data())
    return [
      data.id,
      data.name,
      data.sku,
      data.status,
      data.categoryId,
      String(data.basePriceMinor),
      data.salePriceMinor !== null ? String(data.salePriceMinor) : "",
      data.currency,
      data.createdAt.toDate().toISOString(),
    ]
  })

  const escape = (value: string) =>
    /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value

  return [header, ...rows].map((row) => row.map(escape).join(",")).join("\n")
}
