"use client"

import { useRouter } from "next/navigation"
import { GripVerticalIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import {
  deleteBannerAction,
  reorderBannersAction,
  setBannerActiveAction,
} from "@/features/banners/actions/banner-actions"
import { BannerFormDialog } from "@/features/banners/components/banner-form-dialog"
import { useDragHandle } from "@/hooks/use-drag-handle"
import { SortableContainer } from "@/components/shared/sortable-container"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import type { Banner } from "@/types/banner"

const PLACEMENT_LABELS: Record<string, string> = {
  homepageHero: "Hero (page d'accueil)",
  homepageSecondary: "Secondaire (page d'accueil)",
  catalogTop: "Haut du catalogue",
  checkoutSidebar: "Panneau latéral (checkout)",
}

function BannerRow({ banner }: { banner: Banner }) {
  const router = useRouter()
  const { setNodeRef, attributes, listeners, style } = useDragHandle(banner.id)

  async function toggleActive(isActive: boolean) {
    const result = await setBannerActiveAction(banner.id, isActive)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    router.refresh()
  }

  async function handleDelete() {
    const result = await deleteBannerAction(banner.id)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    toast.success("Bannière supprimée.")
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

      {/* eslint-disable-next-line @next/next/no-img-element -- external Storage URL */}
      <img
        src={banner.imageUrl}
        alt=""
        className="h-12 w-20 rounded-md object-cover"
      />

      <div className="flex flex-1 flex-col">
        <span className="text-sm font-medium">{banner.title}</span>
        <span className="text-muted-foreground text-xs">
          {PLACEMENT_LABELS[banner.placement] ?? banner.placement}
        </span>
      </div>

      <Switch
        checked={banner.isActive}
        onCheckedChange={toggleActive}
        aria-label="Basculer l'activation"
      />

      <BannerFormDialog
        banner={banner}
        nextPosition={banner.position}
        trigger={
          <Button variant="outline" size="sm">
            Modifier
          </Button>
        }
      />

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={handleDelete}
        aria-label="Supprimer"
      >
        <Trash2Icon className="text-destructive" />
      </Button>
    </div>
  )
}

export function BannersList({ banners }: { banners: Banner[] }) {
  const router = useRouter()

  async function handleReorder(orderedIds: string[]) {
    const result = await reorderBannersAction(orderedIds)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    router.refresh()
  }

  if (banners.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-center">
        <p className="font-medium">Aucune bannière</p>
        <p className="text-muted-foreground text-sm">
          Ajoutez un slide pour le Hero ou une bannière promotionnelle.
        </p>
      </div>
    )
  }

  return (
    <SortableContainer items={banners} onReorder={handleReorder}>
      <div className="flex flex-col gap-2">
        {banners.map((banner) => (
          <BannerRow key={banner.id} banner={banner} />
        ))}
      </div>
    </SortableContainer>
  )
}
