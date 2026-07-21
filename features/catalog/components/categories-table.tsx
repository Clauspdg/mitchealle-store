"use client"

import { useRouter } from "next/navigation"
import { GripVerticalIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import {
  deleteCategoryAction,
  reorderCategoriesAction,
  setCategoryActiveAction,
} from "@/features/catalog/actions/category-actions"
import { CategoryFormDialog } from "@/features/catalog/components/category-form-dialog"
import { useDragHandle } from "@/hooks/use-drag-handle"
import { SortableContainer } from "@/components/shared/sortable-container"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
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
import type { ClientSafeCategory } from "@/types/category"

function CategoryRow({
  category,
  categories,
  categoriesById,
}: {
  category: ClientSafeCategory
  categories: ClientSafeCategory[]
  categoriesById: Record<string, ClientSafeCategory>
}) {
  const router = useRouter()
  const { setNodeRef, attributes, listeners, style } = useDragHandle(
    category.id
  )

  async function toggleActive(isActive: boolean) {
    const result = await setCategoryActiveAction(category.id, isActive)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    toast.success(isActive ? "Catégorie activée." : "Catégorie désactivée.")
    router.refresh()
  }

  async function handleDelete() {
    const result = await deleteCategoryAction(category.id)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    toast.success("Catégorie supprimée.")
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
      <TableCell className="font-medium">{category.name}</TableCell>
      <TableCell className="text-muted-foreground">
        {category.parentId
          ? (categoriesById[category.parentId]?.name ?? "—")
          : "—"}
      </TableCell>
      <TableCell>
        <Switch
          checked={category.isActive}
          onCheckedChange={toggleActive}
          aria-label="Basculer l'activation"
        />
      </TableCell>
      <TableCell className="flex justify-end gap-2 text-right">
        <CategoryFormDialog
          category={category}
          categories={categories}
          trigger={
            <Button variant="outline" size="sm">
              Modifier
            </Button>
          }
        />
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button variant="ghost" size="icon-sm" aria-label="Supprimer" />
            }
          >
            <Trash2Icon className="text-destructive" />
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer cette catégorie ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irréversible. La suppression sera refusée si
                des produits sont encore associés à cette catégorie.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  )
}

export function CategoriesTable({
  categories,
}: {
  categories: ClientSafeCategory[]
}) {
  const router = useRouter()

  async function handleReorder(orderedIds: string[]) {
    const result = await reorderCategoriesAction(orderedIds)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    router.refresh()
  }

  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-center">
        <p className="font-medium">Aucune catégorie</p>
        <p className="text-muted-foreground text-sm">
          Créez votre première catégorie pour organiser le catalogue.
        </p>
      </div>
    )
  }

  const categoriesById = Object.fromEntries(categories.map((c) => [c.id, c]))

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">Ordre</TableHead>
            <TableHead>Nom</TableHead>
            <TableHead>Parent</TableHead>
            <TableHead>Active</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <SortableContainer items={categories} onReorder={handleReorder}>
            {categories.map((category) => (
              <CategoryRow
                key={category.id}
                category={category}
                categories={categories}
                categoriesById={categoriesById}
              />
            ))}
          </SortableContainer>
        </TableBody>
      </Table>
    </div>
  )
}
