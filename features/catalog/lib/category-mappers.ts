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
    imageUrl: category.imageUrl,
    bannerImageUrl: category.bannerImageUrl,
    parentId: category.parentId,
    position: category.position,
    isActive: category.isActive,
    customSlug: null,
    seo: category.seo,
  }
}
