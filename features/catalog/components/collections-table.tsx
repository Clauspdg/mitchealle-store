"use client"

import { useRouter } from "next/navigation"
import { GripVerticalIcon } from "lucide-react"
import { toast } from "sonner"

import { reorderCollectionsAction } from "@/features/catalog/actions/collection-actions"
import {
  CollectionFormDialog,
  type CollectionProductOption,
} from "@/features/catalog/components/collection-form-dialog"
import { useDragHandle } from "@/hooks/use-drag-handle"
import { SortableContainer } from "@/components/shared/sortable-container"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Collection, CollectionStatus } from "@/types/collection"

const STATUS_LABELS: Record<CollectionStatus, string> = {
  draft: "Brouillon",
  active: "Active",
  archived: "Archivée",
}

const STATUS_VARIANTS: Record<
  CollectionStatus,
  "default" | "secondary" | "destructive"
> = {
  draft: "secondary",
  active: "default",
  archived: "destructive",
}

function CollectionRow({
  collection,
  products,
}: {
  collection: Collection
  products: CollectionProductOption[]
}) {
  const { setNodeRef, attributes, listeners, style } = useDragHandle(
    collection.id
  )

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
          {collection.primaryColor && (
            <span
              className="size-3 rounded-full border"
              style={{ backgroundColor: collection.primaryColor }}
            />
          )}
          {collection.name}
        </span>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {collection.type === "manual" ? "Manuelle" : "Automatique"}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {collection.productIds?.length ?? 0}
      </TableCell>
      <TableCell>
        <Badge variant={STATUS_VARIANTS[collection.status]}>
          {STATUS_LABELS[collection.status]}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <CollectionFormDialog
          collection={collection}
          products={products}
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

export function CollectionsTable({
  collections,
  products = [],
}: {
  collections: Collection[]
  products?: CollectionProductOption[]
}) {
  const router = useRouter()

  async function handleReorder(orderedIds: string[]) {
    const result = await reorderCollectionsAction(orderedIds)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    router.refresh()
  }

  if (collections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-center">
        <p className="font-medium">Aucune collection</p>
        <p className="text-muted-foreground text-sm">
          Créez votre première collection (ex. Nouveautés, Black Friday...).
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
            <TableHead>Type</TableHead>
            <TableHead>Produits</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <SortableContainer items={collections} onReorder={handleReorder}>
            {collections.map((collection) => (
              <CollectionRow
                key={collection.id}
                collection={collection}
                products={products}
              />
            ))}
          </SortableContainer>
        </TableBody>
      </Table>
    </div>
  )
}
