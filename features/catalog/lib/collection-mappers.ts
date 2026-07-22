import {
  COLLECTION_RULE_FIELDS,
  type CollectionFormInput,
} from "@/schemas/collection.schema"
import type { ClientSafeCollection } from "@/types/collection"

function isKnownRuleField(
  field: string
): field is (typeof COLLECTION_RULE_FIELDS)[number] {
  return (COLLECTION_RULE_FIELDS as readonly string[]).includes(field)
}

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
      rules: [],
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
    // `?? []`: `rules` was added after this store's earliest collections,
    // so it's `undefined` (not `null`) on those older documents. Malformed/
    // legacy rule entries (unknown field) are dropped rather than crashing
    // the enum-typed form.
    rules: (collection.rules ?? [])
      .filter((rule) => isKnownRuleField(rule.field))
      .map((rule) => ({
        field: rule.field as (typeof COLLECTION_RULE_FIELDS)[number],
        operator: "equals" as const,
        value: rule.value,
      })),
    startAt: collection.startAt ? new Date(collection.startAt) : null,
    endAt: collection.endAt ? new Date(collection.endAt) : null,
    status: collection.status,
    position: collection.position,
    seo: collection.seo ?? { title: "", description: "" },
  }
}
