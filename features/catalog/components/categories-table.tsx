"use client"

import { useRouter } from "next/navigation"
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react"
import { toast } from "sonner"

import {
  reorderCategoriesAction,
  setCategoryActiveAction,
} from "@/features/catalog/actions/category-actions"
import { CategoryFormDialog } from "@/features/catalog/components/category-form-dialog"
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
import type { Category } from "@/types/category"

export function CategoriesTable({ categories }: { categories: Category[] }) {
  const router = useRouter()

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= categories.length) return

    const reordered = [...categories]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(target, 0, moved)

    const result = await reorderCategoriesAction(
      reordered.map((category) => category.id)
    )
    if (!result.success) {
      toast.error(result.error)
      return
    }
    router.refresh()
  }

  async function toggleActive(category: Category, isActive: boolean) {
    const result = await setCategoryActiveAction(category.id, isActive)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    toast.success(isActive ? "Catégorie activée." : "Catégorie désactivée.")
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
            <TableHead className="w-24">Ordre</TableHead>
            <TableHead>Nom</TableHead>
            <TableHead>Parent</TableHead>
            <TableHead>Active</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((category, index) => (
            <TableRow key={category.id}>
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
                    disabled={index === categories.length - 1}
                    onClick={() => move(index, 1)}
                    aria-label="Descendre"
                  >
                    <ArrowDownIcon />
                  </Button>
                </div>
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
                  onCheckedChange={(checked) => toggleActive(category, checked)}
                  aria-label="Basculer l'activation"
                />
              </TableCell>
              <TableCell className="text-right">
                <CategoryFormDialog
                  category={category}
                  categories={categories}
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
