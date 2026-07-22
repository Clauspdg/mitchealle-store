"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { GripVerticalIcon, PencilIcon } from "lucide-react"
import { toast } from "sonner"

import {
  reorderHomepageSectionsAction,
  setHomepageSectionActiveAction,
  updateHomepageSectionConfigAction,
} from "@/features/homepage/actions/homepage-actions"
import { useDragHandle } from "@/hooks/use-drag-handle"
import { SortableContainer } from "@/components/shared/sortable-container"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import type {
  ClientSafeHomepageSection,
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

/** Default heading shown on the storefront when no override is set —
 * mirrors the hardcoded strings in app/page.tsx exactly. */
const DEFAULT_HEADINGS: Partial<Record<HomepageSectionType, string>> = {
  popularProducts: "Produits populaires",
  newArrivals: "Nouveautés",
  promotionBanner: "Promotions",
}

const HEADING_EDITABLE_TYPES = new Set<HomepageSectionType>([
  "popularProducts",
  "newArrivals",
  "promotionBanner",
])

export interface HomepageCollectionOption {
  id: string
  name: string
}

function SectionConfigDialog({
  section,
  collections,
}: {
  section: ClientSafeHomepageSection
  collections: HomepageCollectionOption[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [heading, setHeading] = useState(section.config?.heading ?? "")
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>(
    section.config?.collectionIds ?? []
  )

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      setHeading(section.config?.heading ?? "")
      setSelectedCollectionIds(section.config?.collectionIds ?? [])
    }
  }

  function toggleCollection(id: string) {
    setSelectedCollectionIds((current) =>
      current.includes(id)
        ? current.filter((existing) => existing !== id)
        : [...current, id]
    )
  }

  async function handleSave() {
    setSubmitting(true)
    try {
      const result = await updateHomepageSectionConfigAction(section.id, {
        heading: heading.trim() || null,
        collectionIds:
          section.type === "featuredCollections"
            ? selectedCollectionIds.length > 0
              ? selectedCollectionIds
              : null
            : (section.config?.collectionIds ?? null),
      })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success("Section mise à jour.")
      setOpen(false)
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Modifier ${SECTION_LABELS[section.type]}`}
          />
        }
      >
        <PencilIcon />
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{SECTION_LABELS[section.type]}</DialogTitle>
          <DialogDescription>
            Personnalisez le contenu affiché sur la page d&apos;accueil.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {HEADING_EDITABLE_TYPES.has(section.type) && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`heading-${section.id}`}>Titre affiché</Label>
              <Input
                id={`heading-${section.id}`}
                value={heading}
                onChange={(event) => setHeading(event.target.value)}
                placeholder={DEFAULT_HEADINGS[section.type]}
              />
            </div>
          )}

          {section.type === "featuredCollections" && (
            <div className="flex flex-col gap-1.5">
              <Label>Collections à afficher</Label>
              <p className="text-muted-foreground text-xs">
                Aucune sélection = les 6 collections actives les plus récentes
                (comportement par défaut).
              </p>
              <div className="max-h-56 overflow-y-auto rounded-md border">
                {collections.length === 0 ? (
                  <p className="text-muted-foreground p-3 text-sm">
                    Aucune collection active pour le moment.
                  </p>
                ) : (
                  collections.map((collection) => (
                    <label
                      key={collection.id}
                      className="hover:bg-muted flex items-center gap-2 px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCollectionIds.includes(collection.id)}
                        onChange={() => toggleCollection(collection.id)}
                      />
                      {collection.name}
                    </label>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleSave} disabled={submitting}>
            {submitting ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SectionRow({
  section,
  collections,
}: {
  section: ClientSafeHomepageSection
  collections: HomepageCollectionOption[]
}) {
  const router = useRouter()
  const { setNodeRef, attributes, listeners, style } = useDragHandle(section.id)
  const isConfigurable =
    HEADING_EDITABLE_TYPES.has(section.type) ||
    section.type === "featuredCollections"

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
      {isConfigurable && (
        <SectionConfigDialog section={section} collections={collections} />
      )}
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
  collections = [],
}: {
  sections: ClientSafeHomepageSection[]
  collections?: HomepageCollectionOption[]
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
          <SectionRow
            key={section.id}
            section={section}
            collections={collections}
          />
        ))}
      </div>
    </SortableContainer>
  )
}
