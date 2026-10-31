import "server-only"
import { FieldValue, Timestamp } from "firebase-admin/firestore"

import { adminDb } from "@/firebase/admin"
import { HOUSE_SELLER_ID } from "@/config/seller"
import { generateUniqueSlug } from "@/validators/slug.validator"
import { getBrand } from "@/services/firestore/brands"
import { listCategories } from "@/services/firestore/categories"
import { encodeCursor, decodeCursor } from "@/utils/pagination"
import { isMissingIndexError } from "@/utils/firestore-errors"
import { toCsv } from "@/lib/csv"
import {
  productFormSchema,
  type ProductFormInput,
  type ProductSearchParams,
} from "@/schemas/product.schema"
import {
  hasPremiumFilters,
  type CatalogSearchParams,
} from "@/schemas/storefront.schema"
import type { CursorPage } from "@/types/pagination"
import type { Product, ProductDocument, ProductStatus } from "@/types/product"

const PRODUCTS_COLLECTION = "products"
const COLLECTIONS_COLLECTION = "collections"
const PAGE_SIZE = 20
const CSV_EXPORT_LIMIT = 1000
/** Rows are created sequentially (predictable per-row error reporting,
 * no burst of concurrent writes) — this cap keeps one import request
 * bounded and honest about scope, same idiom as `CSV_EXPORT_LIMIT`. */
const CSV_IMPORT_LIMIT = 500
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
 * Storefront-safe lookup by slug — unlike `getProduct`, always forces
 * `status == "published"` so a customer can never load a draft/archived
 * product by guessing or scraping its slug.
 */
export async function getProductBySlug(slug: string): Promise<Product | null> {
  const snapshot = await adminDb
    .collection(PRODUCTS_COLLECTION)
    .where("slug", "==", slug)
    .where("status", "==", "published")
    .limit(1)
    .get()

  return snapshot.empty
    ? null
    : toProduct(snapshot.docs[0].id, snapshot.docs[0].data())
}

/**
 * Unpaginated, bounded fetch for picker UIs (shipment items, inventory
 * search) that need the whole catalog at once rather than a page at a
 * time. Capped at 200 — reasonable for a small/mid catalog; revisit with a
 * real search-as-you-type picker if the catalog outgrows this.
 */
const MAX_COMPARE_PRODUCTS = 4

/**
 * Fetches a bounded, caller-specified set of products by ID (the
 * comparator's session-local selection). No new query shape — parallel
 * `getProduct` calls, same as everywhere else this pattern is needed.
 */
export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  const boundedIds = ids.slice(0, MAX_COMPARE_PRODUCTS)
  const products = await Promise.all(boundedIds.map((id) => getProduct(id)))
  return products.filter((product): product is Product => product !== null)
}

export async function listAllProducts(limit = 200): Promise<Product[]> {
  const snapshot = await adminDb
    .collection(PRODUCTS_COLLECTION)
    .where("status", "!=", "archived")
    .limit(limit)
    .get()
  return snapshot.docs.map((doc) => toProduct(doc.id, doc.data()))
}

/**
 * Customer-safe counterpart to `listAllProducts` — forces `status ==
 * "published"` (that function includes drafts, fine for admin pickers but
 * never safe to expose to a customer-facing search index). Same bound of
 * 200: fine for a small/mid catalog, would need real search infrastructure
 * (and per-query composite indexes) well beyond that.
 */
export async function listPublishedProductsForSearch(
  limit = 200
): Promise<Product[]> {
  const snapshot = await adminDb
    .collection(PRODUCTS_COLLECTION)
    .where("status", "==", "published")
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
    brandId: input.brandId,
    upc: input.upc,
    costMinor: input.costMinor,
    material: input.material,
    weightGrams: input.weightGrams,
    dimensionsCm: input.dimensionsCm,
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

/**
 * A selected `brandId` is the source of truth for the free-text `brand`
 * field — denormalized at write time so every existing consumer of
 * `product.brand` (catalog filters, `getTopBrands` analytics) keeps working
 * unchanged. Falls back to whatever free text was typed if no brand is
 * selected (pre-Sprint-10A products, or a brand outside the managed list).
 */
async function resolveBrandName(
  input: ProductFormInput
): Promise<string | null> {
  if (!input.brandId) return input.brand
  const brand = await getBrand(input.brandId)
  return brand?.name ?? input.brand
}

export async function createProduct(
  input: ProductFormInput,
  actorUid: string
): Promise<Product> {
  const slug = await generateUniqueSlug(input.name, productSlugExists)
  const now = FieldValue.serverTimestamp()
  const brand = await resolveBrandName(input)

  const docData = {
    ...buildDocData(input),
    brand,
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

/**
 * Duplicates a product into a brand-new draft — same catalog data (images,
 * variants, pricing, SEO), a fresh slug/ids, and `status: "draft"` so the
 * copy never appears on the storefront until reviewed and published.
 * `upc` isn't copied (a barcode identifies one physical SKU, not a copy of
 * it); variant ids are regenerated so edits to the copy never touch the
 * original's variants.
 */
export async function duplicateProduct(
  id: string,
  actorUid: string
): Promise<Product> {
  const source = await getProduct(id)
  if (!source) {
    throw new Error(`Product ${id} not found`)
  }

  const input: ProductFormInput = {
    name: `${source.name} (copie)`,
    shortDescription: source.shortDescription,
    description: source.description,
    sku: `${source.sku}-COPY-${Date.now().toString(36).toUpperCase()}`,
    // `?? null` throughout: fields added after this store's earliest
    // products (brandId, costMinor, material...) are `undefined` on those
    // older documents even though the type says `T | null` — Firestore
    // rejects `undefined` in a write, so every nullable field is coerced
    // explicitly rather than trusting the type.
    brand: source.brand ?? null,
    brandId: source.brandId ?? null,
    upc: null,
    costMinor: source.costMinor ?? null,
    material: source.material ?? null,
    weightGrams: source.weightGrams ?? null,
    dimensionsCm: source.dimensionsCm ?? null,
    categoryId: source.categoryId,
    collectionIds: source.collectionIds ?? [],
    images: source.images ?? [],
    basePriceMinor: source.basePriceMinor,
    salePriceMinor: source.salePriceMinor ?? null,
    currency: source.currency,
    variants: (source.variants ?? []).map((variant) => ({
      ...variant,
      id: crypto.randomUUID(),
    })),
    tags: source.tags ?? [],
    status: "draft",
    isComingSoon: false,
    isPreorderable: false,
    preorderMessage: null,
    availableFrom: null,
    seo: source.seo ?? { title: "", description: "", keywords: [] },
  }

  return createProduct(input, actorUid)
}

export async function updateProduct(
  id: string,
  input: ProductFormInput
): Promise<Product> {
  const current = await getProduct(id)
  if (!current) {
    throw new Error(`Product ${id} not found`)
  }
  assertPublishable(current, input.status)

  const slug =
    input.name === current.name
      ? current.slug
      : await generateUniqueSlug(input.name, productSlugExists, current.slug)
  const brand = await resolveBrandName(input)

  await adminDb
    .collection(PRODUCTS_COLLECTION)
    .doc(id)
    .update({
      ...buildDocData(input),
      brand,
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

/**
 * A store product reaches the storefront only through moderation
 * (`services/firestore/seller/moderation.ts`): the regular catalog screens
 * can't publish one that hasn't been approved.
 */
export function assertPublishable(
  product: Pick<ProductDocument, "sellerId" | "moderation">,
  nextStatus: ProductStatus
): void {
  if (
    nextStatus === "published" &&
    product.sellerId &&
    product.sellerId !== HOUSE_SELLER_ID &&
    product.moderation !== "approved"
  ) {
    throw new Error(
      "Ce produit vendeur doit être approuvé depuis la modération avant d'être publié."
    )
  }
}

// --- Status transitions (no physical delete — see docs/firestore-architecture.md §5.1) ---

async function setStatus(id: string, status: ProductStatus): Promise<void> {
  const current = await getProduct(id)
  if (current) assertPublishable(current, status)
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

  let snapshot
  try {
    snapshot = await paged.get()
  } catch (error) {
    if (isMissingIndexError(error)) {
      console.error(
        "[listProducts] Firestore composite index missing — returning an empty page instead of crashing. Deploy indexes: firebase deploy --only firestore:indexes",
        error
      )
      return { items: [], nextCursor: null, hasMore: false }
    }
    throw error
  }

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

function compareProducts(a: Product, b: Product, field: string): number {
  if (field === "createdAt") {
    return a.createdAt.toMillis() - b.createdAt.toMillis()
  }
  if (field === "basePriceMinor") {
    return a.basePriceMinor - b.basePriceMinor
  }
  if (field === "ratingCount") {
    return a.ratingCount - b.ratingCount
  }
  return a.nameLower.localeCompare(b.nameLower)
}

interface OffsetCursorPayload {
  offset: number
}

/**
 * Storefront listing with the Sprint 6 "premium filters" (price range,
 * size, color, brand, gender-tag, on-sale, in-stock). Delegates to the
 * existing `listProducts` byte-for-byte when none of those are active — the
 * common case is completely unchanged. When any are active, this fetches the
 * bounded published catalog once (`listPublishedProductsForSearch`) and
 * filters/sorts/paginates in memory, deliberately avoiding new Firestore
 * composite indexes for every extra filter dimension (see the Sprint 6
 * Phase 1 plan for why). Correct and fast at the current catalog size (a
 * couple hundred products); would need real query-level filtering with
 * dedicated indexes if the catalog grows far beyond that.
 */
export async function listProductsFiltered(
  params: CatalogSearchParams & { status: ProductSearchParams["status"] }
): Promise<CursorPage<Product>> {
  if (!hasPremiumFilters(params)) {
    // `hasPremiumFilters` just confirmed `sort !== "popularity_desc"` (it's
    // one of the conditions it checks), so this cast only narrows back to
    // the enum `listProducts` already accepts — TS can't infer that from an
    // opaque boolean-returning function.
    return listProducts({
      ...params,
      sort: params.sort as ProductSearchParams["sort"],
    })
  }

  const pool = await listPublishedProductsForSearch()
  const term = params.q.trim().toLowerCase()

  const filtered = pool.filter((product) => {
    if (params.categoryId && product.categoryId !== params.categoryId) {
      return false
    }
    if (
      params.collectionId &&
      !product.collectionIds.includes(params.collectionId)
    ) {
      return false
    }
    if (params.brand && product.brand !== params.brand) return false
    if (
      params.size &&
      !product.variants.some((variant) => variant.size === params.size)
    ) {
      return false
    }
    if (
      params.color &&
      !product.variants.some((variant) => variant.color === params.color)
    ) {
      return false
    }
    if (params.gender && !product.tags.includes(params.gender)) return false
    if (params.onSale === "1" && product.salePriceMinor === null) return false
    if (
      params.available === "1" &&
      !product.variants.some((variant) => variant.stock > 0)
    ) {
      return false
    }
    const effectivePriceMajor =
      (product.salePriceMinor ?? product.basePriceMinor) / 100
    if (
      params.priceMin !== undefined &&
      effectivePriceMajor < params.priceMin
    ) {
      return false
    }
    if (
      params.priceMax !== undefined &&
      effectivePriceMajor > params.priceMax
    ) {
      return false
    }
    if (term && !product.nameLower.includes(term)) return false
    return true
  })

  // "popularity_desc" (Sprint 7) has no Firestore-`orderBy`-able equivalent
  // in `sortSpecFor` (shared with the admin listing) — handled here instead
  // of extending that shared function's field set.
  const sort: SortSpec =
    params.sort === "popularity_desc"
      ? { field: "ratingCount", direction: "desc" }
      : sortSpecFor(params.sort)
  const sorted = filtered.sort((a, b) => {
    const cmp = compareProducts(a, b, sort.field)
    return sort.direction === "asc" ? cmp : -cmp
  })

  const offset = params.cursor
    ? decodeCursor<OffsetCursorPayload>(params.cursor).offset
    : 0
  const items = sorted.slice(offset, offset + PAGE_SIZE)
  const hasMore = offset + PAGE_SIZE < sorted.length
  const nextCursor = hasMore
    ? encodeCursor({ offset: offset + PAGE_SIZE } satisfies OffsetCursorPayload)
    : null

  return { items, nextCursor, hasMore }
}

export interface ProductFacets {
  brands: string[]
  sizes: string[]
  colors: string[]
}

/**
 * Distinct brand/size/color values across the published catalog, for the
 * storefront's premium-filter dropdowns. Computed from the same bounded
 * published-catalog fetch `listProductsFiltered` uses — no new Firestore
 * query shape.
 */
export async function getProductFacets(): Promise<ProductFacets> {
  const products = await listPublishedProductsForSearch()

  const brands = new Set<string>()
  const sizes = new Set<string>()
  const colors = new Set<string>()

  for (const product of products) {
    if (product.brand) brands.add(product.brand)
    for (const variant of product.variants) {
      if (variant.size) sizes.add(variant.size)
      if (variant.color) colors.add(variant.color)
    }
  }

  return {
    brands: [...brands].sort(),
    sizes: [...sizes].sort(),
    colors: [...colors].sort(),
  }
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
 * Published-product count per category, for storefront category tiles
 * ("nombre de produits"). Equality-only filters (categoryId + status) need
 * no composite index — same reasoning as every other query in this file.
 */
export async function countPublishedProductsByCategory(
  categoryIds: string[]
): Promise<Record<string, number>> {
  const entries = await Promise.all(
    categoryIds.map(async (categoryId) => {
      const snapshot = await adminDb
        .collection(PRODUCTS_COLLECTION)
        .where("categoryId", "==", categoryId)
        .where("status", "==", "published")
        .count()
        .get()
      return [categoryId, snapshot.data().count] as const
    })
  )
  return Object.fromEntries(entries)
}

/** Column order shared between `exportProductsToCsv` and
 * `importProductsFromCsv` — re-exporting and re-importing the same file
 * round-trips every field this pair understands. */
export const PRODUCT_CSV_COLUMNS = [
  "id",
  "name",
  "sku",
  "status",
  "categoryId",
  "categoryName",
  "brand",
  "basePriceMinor",
  "salePriceMinor",
  "currency",
  "upc",
  "weightGrams",
  "dimensionsCm",
  "shortDescription",
  "description",
  "imageUrl",
  "stock",
  "createdAt",
] as const

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
  const [snapshot, categories] = await Promise.all([
    query.orderBy("__name__", sort.direction).limit(CSV_EXPORT_LIMIT).get(),
    listCategories(),
  ])
  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]))

  const rows = snapshot.docs.map((doc) => {
    const data = toProduct(doc.id, doc.data())
    const defaultVariant =
      data.variants.find((v) => v.isDefault) ?? data.variants[0]
    return [
      data.id,
      data.name,
      data.sku,
      data.status,
      data.categoryId,
      categoryNameById.get(data.categoryId) ?? "",
      data.brand ?? "",
      String(data.basePriceMinor),
      data.salePriceMinor !== null ? String(data.salePriceMinor) : "",
      data.currency,
      data.upc ?? "",
      data.weightGrams !== null ? String(data.weightGrams) : "",
      data.dimensionsCm ?? "",
      data.shortDescription,
      data.description,
      data.images[0]?.url ?? "",
      defaultVariant ? String(defaultVariant.stock) : "0",
      data.createdAt.toDate().toISOString(),
    ]
  })

  return toCsv([[...PRODUCT_CSV_COLUMNS], ...rows])
}

export interface ProductCsvImportError {
  row: number
  message: string
}

export interface ProductCsvImportResult {
  created: number
  errors: ProductCsvImportError[]
}

/**
 * Bulk-creates products from parsed CSV records (see `PRODUCT_CSV_COLUMNS`
 * for the expected header) — each row goes through the exact same
 * `productFormSchema` validation and `createProduct` path as the manual
 * form, so an imported product is indistinguishable from a hand-created
 * one. Rows import sequentially so one bad row doesn't abort the batch —
 * every row gets its own success/failure outcome, reported back by row
 * number (2-based: row 1 is the header).
 *
 * Only creates products — there's no SKU-based upsert yet (see the Sprint
 * 12 Phase 3 report for that as a follow-up). Imported products always
 * land as `status: "draft"` regardless of any `status` column, so nothing
 * goes live on the storefront without an explicit publish.
 */
export async function importProductsFromCsv(
  records: Record<string, string>[],
  actorUid: string
): Promise<ProductCsvImportResult> {
  const categories = await listCategories()
  const categoryIds = new Set(categories.map((c) => c.id))
  const categoryIdByName = new Map(
    categories.map((c) => [c.name.trim().toLowerCase(), c.id])
  )

  const bounded = records.slice(0, CSV_IMPORT_LIMIT)
  const errors: ProductCsvImportError[] = []
  let created = 0

  for (let index = 0; index < bounded.length; index++) {
    const rowNumber = index + 2
    const record = bounded[index]

    try {
      const name = record.name?.trim()
      if (!name) throw new Error("La colonne « name » est requise.")

      const sku = record.sku?.trim()
      if (!sku) throw new Error("La colonne « sku » est requise.")

      const imageUrl = record.imageUrl?.trim()
      if (!imageUrl) {
        throw new Error(
          "La colonne « imageUrl » est requise (chaque produit a besoin d'au moins une image)."
        )
      }

      let categoryId = record.categoryId?.trim() ?? ""
      if (!categoryId || !categoryIds.has(categoryId)) {
        const byName = record.categoryName?.trim().toLowerCase()
        categoryId = (byName && categoryIdByName.get(byName)) || ""
      }
      if (!categoryId) {
        throw new Error(
          `Catégorie introuvable : "${record.categoryName || record.categoryId || ""}".`
        )
      }

      const basePriceMinor = Number(record.basePriceMinor)
      if (!Number.isInteger(basePriceMinor) || basePriceMinor <= 0) {
        throw new Error(
          "« basePriceMinor » doit être un nombre entier positif."
        )
      }

      const salePriceMinorRaw = record.salePriceMinor?.trim()
      const salePriceMinor = salePriceMinorRaw
        ? Number(salePriceMinorRaw)
        : null
      if (
        salePriceMinor !== null &&
        (!Number.isInteger(salePriceMinor) || salePriceMinor <= 0)
      ) {
        throw new Error(
          "« salePriceMinor » doit être un nombre entier positif, ou vide."
        )
      }

      const stockRaw = record.stock?.trim()
      const stock = stockRaw ? Number(stockRaw) : 0
      if (!Number.isInteger(stock) || stock < 0) {
        throw new Error("« stock » doit être un nombre entier positif ou nul.")
      }

      const weightGramsRaw = record.weightGrams?.trim()
      const weightGrams =
        weightGramsRaw && Number.isInteger(Number(weightGramsRaw))
          ? Number(weightGramsRaw)
          : null

      const input: ProductFormInput = {
        name,
        shortDescription: record.shortDescription?.trim() ?? "",
        description: record.description?.trim() || name,
        sku,
        brand: record.brand?.trim() || null,
        brandId: null,
        upc: record.upc?.trim() || null,
        costMinor: null,
        material: null,
        weightGrams,
        dimensionsCm: record.dimensionsCm?.trim() || null,
        categoryId,
        collectionIds: [],
        images: [{ url: imageUrl, alt: name, position: 0 }],
        basePriceMinor,
        salePriceMinor,
        currency: record.currency?.trim() || "HTG",
        variants: [
          {
            id: crypto.randomUUID(),
            sku,
            size: null,
            color: null,
            priceMinor: null,
            stock,
            isDefault: true,
          },
        ],
        tags: [],
        status: "draft",
        isComingSoon: false,
        isPreorderable: false,
        preorderMessage: null,
        availableFrom: null,
        seo: { title: "", description: "", keywords: [] },
      }

      const parsed = productFormSchema.safeParse(input)
      if (!parsed.success) {
        throw new Error(
          parsed.error.issues[0]?.message ?? "Données de produit invalides."
        )
      }

      await createProduct(parsed.data, actorUid)
      created++
    } catch (error) {
      errors.push({
        row: rowNumber,
        message: error instanceof Error ? error.message : "Erreur inconnue.",
      })
    }
  }

  return { created, errors }
}
