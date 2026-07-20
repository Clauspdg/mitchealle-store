"use client"

import { useRouter } from "next/navigation"
import { GripVerticalIcon } from "lucide-react"
import { toast } from "sonner"

import {
  reorderHomepageSectionsAction,
  setHomepageSectionActiveAction,
} from "@/features/homepage/actions/homepage-actions"
import { useDragHandle } from "@/hooks/use-drag-handle"
import { SortableContainer } from "@/components/shared/sortable-container"
import { Switch } from "@/components/ui/switch"
import type {
  HomepageSection,
  HomepageSectionType,
} from "@/types/homepage-section"

const SECTION_LABELS: Record<HomepageSectionType, string> = {
  heroBanner: "Hero (bannière principale)",
  featuredCollections: "Collections mises en avant",
  categoriesShowcase: "Catégories",
  popularProducts: "Produits populaires",
  newArrivals: "Nouveautés",
  promotionBanner: "Promotions",
  brandsStrip: "Marques",
  newsletterSignup: "Newsletter",
}

function SectionRow({ section }: { section: HomepageSection }) {
  const router = useRouter()
  const { setNodeRef, attributes, listeners, style } = useDragHandle(section.id)

  async function toggleActive(isActive: boolean) {
    const result = await setHomepageSectionActiveAction(section.id, isActive)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    router.refresh()
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-card flex items-center gap-3 rounded-lg border p-3"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="text-muted-foreground cursor-grab active:cursor-grabbing"
        aria-label="Réordonner"
      >
        <GripVerticalIcon className="size-4" />
      </button>
      <span className="flex-1 text-sm font-medium">
        {SECTION_LABELS[section.type]}
      </span>
      <Switch
        checked={section.isActive}
        onCheckedChange={toggleActive}
        aria-label="Activer/désactiver cette section"
      />
    </div>
  )
}

export function HomepageSectionsList({
  sections,
}: {
  sections: HomepageSection[]
}) {
  const router = useRouter()

  async function handleReorder(orderedIds: string[]) {
    const result = await reorderHomepageSectionsAction(orderedIds)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    router.refresh()
  }

  return (
    <SortableContainer items={sections} onReorder={handleReorder}>
      <div className="flex flex-col gap-2">
        {sections.map((section) => (
          <SectionRow key={section.id} section={section} />
        ))}
      </div>
    </SortableContainer>
  )
}
