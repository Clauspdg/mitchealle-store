"use client"

import { useRouter } from "next/navigation"
import { GripVerticalIcon } from "lucide-react"
import { toast } from "sonner"

import {
  reorderBrandsAction,
  setBrandActiveAction,
} from "@/features/catalog/actions/brand-actions"
import { BrandFormDialog } from "@/features/catalog/components/brand-form-dialog"
import { useDragHandle } from "@/hooks/use-drag-handle"
import { SortableContainer } from "@/components/shared/sortable-container"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Brand } from "@/types/brand"

function BrandRow({ brand }: { brand: Brand }) {
  const router = useRouter()
  const { setNodeRef, attributes, listeners, style } = useDragHandle(brand.id)

  async function toggleActive(isActive: boolean) {
    const result = await setBrandActiveAction(brand.id, isActive)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    toast.success(isActive ? "Marque activée." : "Marque désactivée.")
    router.refresh()
  }

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell>
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="text-muted-foreground cursor-grab active:cursor-grabbing"
          aria-label="Réordonner"
        >
          <GripVerticalIcon className="size-4" />
        </button>
      </TableCell>
      <TableCell className="font-medium">
        <span className="flex items-center gap-2">
          {brand.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- external Storage URL
            <img
              src={brand.logoUrl}
              alt=""
              className="size-6 rounded object-contain"
            />
          ) : null}
          {brand.name}
        </span>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {brand.country ?? "—"}
      </TableCell>
      <TableCell>
        <Switch
          checked={brand.isActive}
          onCheckedChange={toggleActive}
          aria-label="Basculer l'activation"
        />
      </TableCell>
      <TableCell className="text-right">
        <BrandFormDialog
          brand={brand}
          nextPosition={brand.position}
          trigger={
            <Button variant="outline" size="sm">
              Modifier
            </Button>
          }
        />
      </TableCell>
    </TableRow>
  )
}

export function BrandsTable({ brands }: { brands: Brand[] }) {
  const router = useRouter()

  async function handleReorder(orderedIds: string[]) {
    const result = await reorderBrandsAction(orderedIds)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    router.refresh()
  }

  if (brands.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-center">
        <p className="font-medium">Aucune marque</p>
        <p className="text-muted-foreground text-sm">
          Créez votre première marque pour l&apos;associer à vos produits.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">Ordre</TableHead>
            <TableHead>Nom</TableHead>
            <TableHead>Pays</TableHead>
            <TableHead>Active</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <SortableContainer items={brands} onReorder={handleReorder}>
            {brands.map((brand) => (
              <BrandRow key={brand.id} brand={brand} />
            ))}
          </SortableContainer>
        </TableBody>
      </Table>
    </div>
  )
}
