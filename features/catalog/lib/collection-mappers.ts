import type { CollectionFormInput } from "@/schemas/collection.schema"
import type { Collection } from "@/types/collection"

export function collectionToFormDefaults(
  collection?: Collection
): CollectionFormInput {
  if (!collection) {
    return {
      name: "",
      description: null,
      coverImageUrl: null,
      bannerImageUrl: null,
      primaryColor: null,
      type: "manual",
      productIds: [],
      startAt: null,
      endAt: null,
      status: "draft",
      position: 0,
    }
  }

  return {
    name: collection.name,
    description: collection.description,
    coverImageUrl: collection.coverImageUrl,
    bannerImageUrl: collection.bannerImageUrl,
    primaryColor: collection.primaryColor,
    type: collection.type,
    productIds: collection.productIds ?? [],
    startAt: collection.startAt ? collection.startAt.toDate() : null,
    endAt: collection.endAt ? collection.endAt.toDate() : null,
    status: collection.status,
    position: collection.position,
  }
}
