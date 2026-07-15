import type { CategoryFormInput } from "@/schemas/category.schema"
import type { Category } from "@/types/category"

export function categoryToFormDefaults(category?: Category): CategoryFormInput {
  if (!category) {
    return {
      name: "",
      description: "",
      icon: null,
      imageUrl: null,
      parentId: null,
      position: 0,
      isActive: true,
      seo: { title: "", description: "" },
    }
  }

  return {
    name: category.name,
    description: category.description,
    icon: category.icon,
    imageUrl: category.imageUrl,
    parentId: category.parentId,
    position: category.position,
    isActive: category.isActive,
    seo: category.seo,
  }
}
