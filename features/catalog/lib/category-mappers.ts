import type { CategoryFormInput } from "@/schemas/category.schema"
import type { ClientSafeCategory } from "@/types/category"

export function categoryToFormDefaults(
  category?: ClientSafeCategory
): CategoryFormInput {
  if (!category) {
    return {
      name: "",
      description: "",
      icon: null,
      color: null,
      imageUrl: null,
      bannerImageUrl: null,
      parentId: null,
      position: 0,
      isActive: true,
      customSlug: null,
      seo: { title: "", description: "" },
    }
  }

  return {
    name: category.name,
    description: category.description,
    icon: category.icon,
    // `?? null`: `color` was added after this store's earliest categories,
    // so it's `undefined` (not `null`) on those older documents even
    // though the type says `string | null` — matters here since
    // `CategoryFormInput`'s `color` must be exactly `string | null`.
    color: category.color ?? null,
    imageUrl: category.imageUrl,
    bannerImageUrl: category.bannerImageUrl,
    parentId: category.parentId,
    position: category.position,
    isActive: category.isActive,
    customSlug: null,
    seo: category.seo,
  }
}
