"use client"

import { useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { DownloadIcon, SearchIcon } from "lucide-react"
import { toast } from "sonner"

import { useDebouncedCallback } from "@/hooks/use-debounced-callback"
import { exportProductsCsvAction } from "@/features/catalog/actions/product-actions"
import { ImportProductsDialog } from "@/features/catalog/components/import-products-dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ClientSafeCategory } from "@/types/category"
import type { ClientSafeCollection } from "@/types/collection"

interface ProductsToolbarProps {
  categories: ClientSafeCategory[]
  collections: ClientSafeCollection[]
}

// Base UI's `Select.Value` only resolves a value to its label from an
// explicit `items` map — it does not scan the rendered `<SelectItem>`
// children for this — so without it the trigger displays the raw value
// (e.g. "all", "createdAt_desc") instead of its French label.
const STATUS_ITEMS = {
  all: "Tous les statuts",
  draft: "Brouillon",
  published: "Publié",
  archived: "Archivé",
}

const SORT_ITEMS = {
  createdAt_desc: "Plus récents",
  createdAt_asc: "Plus anciens",
  name_asc: "Nom (A→Z)",
  name_desc: "Nom (Z→A)",
  price_asc: "Prix croissant",
  price_desc: "Prix décroissant",
}

export function ProductsToolbar({
  categories,
  collections,
}: ProductsToolbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const categoryItems = useMemo(
    () => ({
      all: "Toutes les catégories",
      ...Object.fromEntries(categories.map((c) => [c.id, c.name])),
    }),
    [categories]
  )
  const collectionItems = useMemo(
    () => ({
      all: "Toutes les collections",
      ...Object.fromEntries(collections.map((c) => [c.id, c.name])),
    }),
    [collections]
  )
  // Base UI's `Input` is a controlled-aware "FieldControl" — unlike a plain
  // HTML input, it doesn't silently ignore `defaultValue` changing after
  // mount, so binding it directly to `searchParams` (which changes on every
  // debounced keystroke's URL update) trips its uncontrolled/controlled
  // resync warning. Local state is the single source of truth for what's
  // typed; the URL update is just a debounced side effect.
  const [searchValue, setSearchValue] = useState(searchParams.get("q") ?? "")

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
          value={searchValue}
          onChange={(event) => {
            setSearchValue(event.target.value)
            debouncedSetSearch(event.target.value)
          }}
          className="w-56 pl-8"
        />
      </div>

      <Select
        items={STATUS_ITEMS}
        value={searchParams.get("status") ?? "all"}
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
        items={categoryItems}
        value={searchParams.get("categoryId") || "all"}
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
        items={collectionItems}
        value={searchParams.get("collectionId") || "all"}
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
        items={SORT_ITEMS}
        value={searchParams.get("sort") ?? "createdAt_desc"}
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

      <div className="ml-auto flex gap-2">
        <ImportProductsDialog />
        <Button variant="outline" onClick={handleExport}>
          <DownloadIcon />
          Exporter CSV
        </Button>
      </div>
    </div>
  )
}
