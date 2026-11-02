import "server-only"
import { FieldValue } from "firebase-admin/firestore"

import { adminDb } from "@/firebase/admin"
import { belongsToSeller } from "@/lib/seller-access"
import type { SellerContext } from "@/lib/seller-session.server"
import { generateUniqueSlug } from "@/validators/slug.validator"
import { productSlugExists } from "@/services/firestore/products"
import { getStoreSettings } from "@/services/firestore/settings"
import { getSeller } from "@/services/firestore/seller/sellers"
import { SellerWorkflowError } from "@/services/firestore/seller/applications"
import { isSellerProductImage } from "@/services/storage/seller-files"
import type {
  SellerProductInput,
  SellerStockInput,
} from "@/schemas/product.schema"
import type { Product, ProductDocument, ProductVariant } from "@/types/product"

const PRODUCTS = "products"
const DECISIONS = "sellerDecisions"
const STOCK_MOVEMENTS = "sellerStockMovements"

/** Same message whether the product is missing or another store's, so a
 * store can't probe what others own. */
const NOT_FOUND = "Produit introuvable."

/** A store sells in the marketplace's currency: a price in another one
 * could never be ordered. */
async function assertStoreCurrency(input: SellerProductInput) {
  const { currency } = await getStoreSettings()
  if (input.currency.toUpperCase() !== currency) {
    throw new SellerWorkflowError(`Les prix doivent être en ${currency}.`)
  }
}

function contentFields(input: SellerProductInput) {
  return {
    name: input.name,
    nameLower: input.name.toLowerCase(),
    shortDescription: input.shortDescription,
    description: input.description,
    sku: input.sku,
    brand: input.brand,
    upc: input.upc,
    material: input.material,
    weightGrams: input.weightGrams,
    dimensionsCm: input.dimensionsCm,
    categoryId: input.categoryId,
    images: input.images.map((image, position) => ({ ...image, position })),
    basePriceMinor: input.basePriceMinor,
    salePriceMinor: input.salePriceMinor,
    currency: input.currency.toUpperCase(),
    tags: input.tags,
    seo: input.seo,
  }
}

function toVariants(
  input: SellerProductInput["variants"],
  stockOf: (variantId: string) => number | undefined
): ProductVariant[] {
  if (new Set(input.map((variant) => variant.id)).size !== input.length) {
    throw new SellerWorkflowError("Deux variantes ont le même identifiant.")
  }
  const defaultIndex = Math.max(
    0,
    input.findIndex((variant) => variant.isDefault)
  )
  return input.map((variant, index) => ({
    id: variant.id,
    sku: variant.sku,
    size: variant.size || null,
    color: variant.color || null,
    priceMinor: variant.priceMinor,
    stock: stockOf(variant.id) ?? variant.stock,
    isDefault: index === defaultIndex,
    imageUrl: null,
  }))
}

async function assertActiveCategory(categoryId: string) {
  const category = await adminDb.collection("categories").doc(categoryId).get()
  if (!category.exists || category.data()?.isActive !== true) {
    throw new SellerWorkflowError("Catégorie introuvable.")
  }
}

/** Every image is either already on the product or an object this store
 * uploaded to its own folder: no other store's file, no external URL. */
async function assertOwnImages(
  context: SellerContext,
  images: SellerProductInput["images"],
  alreadyOnProduct: string[] = []
) {
  const checks = await Promise.all(
    images.map(
      (image) =>
        alreadyOnProduct.includes(image.url) ||
        isSellerProductImage(context.sellerId, image.url)
    )
  )
  if (checks.some((ok) => !ok)) {
    throw new SellerWorkflowError(
      "Une image n'appartient pas à votre boutique. Téléversez-la à nouveau."
    )
  }
}

function submittedDecision(
  tx: FirebaseFirestore.Transaction | FirebaseFirestore.WriteBatch,
  context: SellerContext,
  storeName: string,
  productId: string,
  productName: string
) {
  tx.create(adminDb.collection(DECISIONS).doc(), {
    type: "product_submitted",
    applicationId: null,
    sellerId: context.sellerId,
    storeName,
    productId,
    productName,
    reason: null,
    actorUid: context.uid,
    actorEmail: context.email,
    createdAt: FieldValue.serverTimestamp(),
  })
}

/**
 * A new store product starts as a draft waiting for moderation: it reaches
 * the storefront only once an admin approves it. Every protected field is
 * set here, never taken from the request.
 */
export async function createSellerProduct(
  context: SellerContext,
  input: SellerProductInput
): Promise<string> {
  const seller = await getSeller(context.sellerId)
  if (!seller) throw new SellerWorkflowError("Boutique introuvable.")
  await Promise.all([
    assertActiveCategory(input.categoryId),
    assertOwnImages(context, input.images),
    assertStoreCurrency(input),
  ])

  const slug = await generateUniqueSlug(input.name, productSlugExists)
  const ref = adminDb.collection(PRODUCTS).doc()
  const now = FieldValue.serverTimestamp()
  const batch = adminDb.batch()
  batch.create(ref, {
    ...contentFields(input),
    slug,
    variants: toVariants(input.variants, () => undefined),
    brandId: null,
    costMinor: null,
    collectionIds: [],
    status: "draft",
    isComingSoon: false,
    isPreorderable: false,
    preorderWindow: null,
    preorderMessage: null,
    availableFrom: null,
    ratingAverage: 0,
    ratingCount: 0,
    createdAt: now,
    updatedAt: now,
    createdBy: context.uid,
    sellerId: context.sellerId,
    sellerName: seller.name,
    moderation: "pending",
    moderationNote: null,
    moderationRevision: 1,
    moderatedBy: null,
  })
  submittedDecision(batch, context, seller.name, ref.id, input.name)
  await batch.commit()
  return ref.id
}

/**
 * Any content change goes back to moderation and leaves the storefront until
 * approved again, so an approved listing can't be swapped for something
 * else. Stock isn't content: existing variants keep their stored quantity,
 * which only the stock page changes.
 */
export async function updateSellerProduct(
  context: SellerContext,
  productId: string,
  input: SellerProductInput
): Promise<void> {
  const ref = adminDb.collection(PRODUCTS).doc(productId)
  const before = await ref.get()
  const current = before.exists ? (before.data() as ProductDocument) : null
  if (!current || !belongsToSeller(current, context.sellerId)) {
    throw new SellerWorkflowError(NOT_FOUND)
  }
  await Promise.all([
    assertActiveCategory(input.categoryId),
    assertStoreCurrency(input),
  ])
  const slug =
    input.name === current.name
      ? current.slug
      : await generateUniqueSlug(input.name, productSlugExists, current.slug)

  await adminDb.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref)
    const product = snapshot.data() as ProductDocument | undefined
    if (!product || !belongsToSeller(product, context.sellerId)) {
      throw new SellerWorkflowError(NOT_FOUND)
    }
    if (product.status === "archived") {
      throw new SellerWorkflowError("Ce produit est archivé.")
    }
    await assertOwnImages(
      context,
      input.images,
      product.images.map((image) => image.url)
    )

    const storedStock = new Map(
      product.variants.map((variant) => [variant.id, variant.stock])
    )
    tx.update(ref, {
      ...contentFields(input),
      slug,
      variants: toVariants(input.variants, (id) => storedStock.get(id)),
      status: "draft",
      moderation: "pending",
      moderationNote: null,
      moderationRevision: (product.moderationRevision ?? 0) + 1,
      updatedAt: FieldValue.serverTimestamp(),
    })
    submittedDecision(
      tx,
      context,
      product.sellerName ?? "",
      productId,
      input.name
    )
  })
}

/** Sets one variant's sellable stock and logs the change. Moderation is left
 * as it is: a quantity says nothing new about the listing. */
export async function setSellerVariantStock(
  context: SellerContext,
  input: SellerStockInput
): Promise<{ before: number; after: number }> {
  const ref = adminDb.collection(PRODUCTS).doc(input.productId)

  return adminDb.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref)
    const product = snapshot.data() as ProductDocument | undefined
    if (!product || !belongsToSeller(product, context.sellerId)) {
      throw new SellerWorkflowError(NOT_FOUND)
    }
    const variant = product.variants.find((v) => v.id === input.variantId)
    if (!variant) throw new SellerWorkflowError("Variante introuvable.")

    const before = variant.stock
    tx.update(ref, {
      variants: product.variants.map((v) =>
        v.id === input.variantId ? { ...v, stock: input.stock } : v
      ),
      updatedAt: FieldValue.serverTimestamp(),
    })
    tx.create(adminDb.collection(STOCK_MOVEMENTS).doc(), {
      sellerId: context.sellerId,
      productId: input.productId,
      variantId: input.variantId,
      quantityBefore: before,
      quantityAfter: input.stock,
      delta: input.stock - before,
      reason: input.reason || null,
      actorUid: context.uid,
      createdAt: FieldValue.serverTimestamp(),
    })
    return { before, after: input.stock }
  })
}

export const LOW_STOCK_THRESHOLD = 5

export interface SellerDashboard {
  products: number
  published: number
  pending: number
  rejected: number
  units: number
  outOfStockVariants: number
  lowStockVariants: number
  activeMembers: number
}

/** Figures computed from the store's own documents only: no orders or
 * revenue yet, they arrive with the seller orders phase. */
export async function getSellerDashboard(
  context: SellerContext,
  products: Product[]
): Promise<SellerDashboard> {
  const members = await adminDb
    .collection("sellerMembers")
    .where("sellerId", "==", context.sellerId)
    .where("status", "==", "active")
    .count()
    .get()
  const variants = products
    .filter((product) => product.status !== "archived")
    .flatMap((product) => product.variants)

  return {
    products: products.length,
    published: products.filter((p) => p.status === "published").length,
    pending: products.filter((p) => p.moderation === "pending").length,
    rejected: products.filter((p) => p.moderation === "rejected").length,
    units: variants.reduce((sum, v) => sum + Math.max(0, v.stock), 0),
    outOfStockVariants: variants.filter((v) => v.stock <= 0).length,
    lowStockVariants: variants.filter(
      (v) => v.stock > 0 && v.stock <= LOW_STOCK_THRESHOLD
    ).length,
    activeMembers: members.data().count,
  }
}
