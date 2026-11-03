import { REFERENCE_CURRENCY } from "@/config/currency"
import type { ProductFormInput } from "@/schemas/product.schema"
import type { ClientSafeProduct, Product } from "@/types/product"

/** Same conversion as app/admin/products/[id]/page.tsx: `Timestamp` fields
 * can't cross into a Client Component. */
export function toClientSafeProduct(product: Product): ClientSafeProduct {
  const {
    preorderWindow: _preorderWindow,
    availableFrom,
    createdAt: _createdAt,
    updatedAt,
    ...rest
  } = product
  return {
    ...rest,
    availableFrom: availableFrom?.toMillis() ?? null,
    updatedAt: updatedAt.toMillis(),
  }
}

export function productToFormDefaults(
  product?: ClientSafeProduct
): ProductFormInput {
  if (!product) {
    return {
      name: "",
      shortDescription: "",
      description: "",
      sku: "",
      brand: null,
      brandId: null,
      upc: null,
      costMinor: null,
      costCurrency: REFERENCE_CURRENCY,
      material: null,
      weightGrams: null,
      dimensionsCm: null,
      categoryId: "",
      collectionIds: [],
      images: [],
      basePriceMinor: 0,
      salePriceMinor: null,
      currency: REFERENCE_CURRENCY,
      variants: [],
      tags: [],
      status: "draft",
      isComingSoon: false,
      isPreorderable: false,
      preorderMessage: null,
      availableFrom: null,
      seo: { title: "", description: "", keywords: [] },
    }
  }

  return {
    name: product.name,
    shortDescription: product.shortDescription,
    description: product.description,
    sku: product.sku,
    brand: product.brand,
    brandId: product.brandId,
    upc: product.upc,
    costMinor: product.costMinor,
    costCurrency: product.costCurrency ?? null,
    material: product.material,
    weightGrams: product.weightGrams,
    dimensionsCm: product.dimensionsCm,
    categoryId: product.categoryId,
    collectionIds: product.collectionIds,
    images: product.images,
    basePriceMinor: product.basePriceMinor,
    salePriceMinor: product.salePriceMinor,
    currency: product.currency,
    variants: product.variants,
    tags: product.tags,
    status: product.status,
    isComingSoon: product.isComingSoon,
    isPreorderable: product.isPreorderable,
    preorderMessage: product.preorderMessage,
    availableFrom: product.availableFrom
      ? new Date(product.availableFrom)
      : null,
    seo: product.seo,
  }
}
