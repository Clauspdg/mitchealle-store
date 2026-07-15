"use client"

import { useRouter } from "next/navigation"
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react"
import { toast } from "sonner"

import { reorderCollectionsAction } from "@/features/catalog/actions/collection-actions"
import { CollectionFormDialog } from "@/features/catalog/components/collection-form-dialog"
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

export function CollectionsTable({
  collections,
}: {
  collections: Collection[]
}) {
  const router = useRouter()

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= collections.length) return

    const reordered = [...collections]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(target, 0, moved)

    const result = await reorderCollectionsAction(reordered.map((c) => c.id))
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
            <TableHead className="w-24">Ordre</TableHead>
            <TableHead>Nom</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Produits</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {collections.map((collection, index) => (
            <TableRow key={collection.id}>
              <TableCell>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    aria-label="Monter"
                  >
                    <ArrowUpIcon />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={index === collections.length - 1}
                    onClick={() => move(index, 1)}
                    aria-label="Descendre"
                  >
                    <ArrowDownIcon />
                  </Button>
                </div>
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
                  trigger={
                    <Button variant="outline" size="sm">
                      Modifier
                    </Button>
                  }
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
