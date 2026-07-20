import type { ProductFormInput } from "@/schemas/product.schema"
import type { Product } from "@/types/product"

export function productToFormDefaults(product?: Product): ProductFormInput {
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
      material: null,
      weightGrams: null,
      dimensionsCm: null,
      categoryId: "",
      collectionIds: [],
      images: [],
      basePriceMinor: 0,
      salePriceMinor: null,
      currency: "USD",
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
      ? product.availableFrom.toDate()
      : null,
    seo: product.seo,
  }
}
