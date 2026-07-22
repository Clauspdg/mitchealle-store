import type { CollectionFormInput } from "@/schemas/collection.schema"
import type { ClientSafeCollection } from "@/types/collection"

export function collectionToFormDefaults(
  collection?: ClientSafeCollection
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
      seo: { title: "", description: "" },
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
    startAt: collection.startAt ? new Date(collection.startAt) : null,
    endAt: collection.endAt ? new Date(collection.endAt) : null,
    status: collection.status,
    position: collection.position,
    seo: collection.seo ?? { title: "", description: "" },
  }
}
