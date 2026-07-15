"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { DownloadIcon, SearchIcon } from "lucide-react"
import { toast } from "sonner"

import { useDebouncedCallback } from "@/hooks/use-debounced-callback"
import { exportProductsCsvAction } from "@/features/catalog/actions/product-actions"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Category } from "@/types/category"
import type { Collection } from "@/types/collection"

interface ProductsToolbarProps {
  categories: Category[]
  collections: Collection[]
}

export function ProductsToolbar({
  categories,
  collections,
}: ProductsToolbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete("cursor")
    router.push(`${pathname}?${params.toString()}`)
  }

  const debouncedSetSearch = useDebouncedCallback(
    (value: string) => setParam("q", value),
    300
  )

  async function handleExport() {
    const result = await exportProductsCsvAction({
      q: searchParams.get("q") ?? "",
      status: searchParams.get("status") ?? "all",
      categoryId: searchParams.get("categoryId") ?? "",
      collectionId: searchParams.get("collectionId") ?? "",
      sort: searchParams.get("sort") ?? "createdAt_desc",
    })

    if (!result.success) {
      toast.error(result.error)
      return
    }

    const blob = new Blob([result.data], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `produits-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success("Export CSV généré.")
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          placeholder="Rechercher un produit..."
          defaultValue={searchParams.get("q") ?? ""}
          onChange={(event) => debouncedSetSearch(event.target.value)}
          className="w-56 pl-8"
        />
      </div>

      <Select
        defaultValue={searchParams.get("status") ?? "all"}
        onValueChange={(value) => setParam("status", value)}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Statut" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les statuts</SelectItem>
          <SelectItem value="draft">Brouillon</SelectItem>
          <SelectItem value="published">Publié</SelectItem>
          <SelectItem value="archived">Archivé</SelectItem>
        </SelectContent>
      </Select>

      <Select
        defaultValue={searchParams.get("categoryId") ?? ""}
        onValueChange={(value) =>
          setParam("categoryId", value === "all" ? "" : value)
        }
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Catégorie" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes les catégories</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        defaultValue={searchParams.get("collectionId") ?? ""}
        onValueChange={(value) =>
          setParam("collectionId", value === "all" ? "" : value)
        }
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Collection" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes les collections</SelectItem>
          {collections.map((collection) => (
            <SelectItem key={collection.id} value={collection.id}>
              {collection.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        defaultValue={searchParams.get("sort") ?? "createdAt_desc"}
        onValueChange={(value) => setParam("sort", value)}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Trier par" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="createdAt_desc">Plus récents</SelectItem>
          <SelectItem value="createdAt_asc">Plus anciens</SelectItem>
          <SelectItem value="name_asc">Nom (A→Z)</SelectItem>
          <SelectItem value="name_desc">Nom (Z→A)</SelectItem>
          <SelectItem value="price_asc">Prix croissant</SelectItem>
          <SelectItem value="price_desc">Prix décroissant</SelectItem>
        </SelectContent>
      </Select>

      <Button variant="outline" onClick={handleExport} className="ml-auto">
        <DownloadIcon />
        Exporter CSV
      </Button>
    </div>
  )
}
