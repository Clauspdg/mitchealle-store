"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { SearchIcon } from "lucide-react"

import { useDebouncedCallback } from "@/hooks/use-debounced-callback"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
// Deliberately just `{id, name}` — not the Firestore `Category`/`Collection`
// types, which carry `createdAt`/`updatedAt` as Firestore `Timestamp` class
// instances. React rejects passing non-plain objects from a Server
// Component to a Client Component across the RSC boundary.
interface FilterOption {
  id: string
  name: string
}

interface CatalogFiltersProps {
  categories: FilterOption[]
  collections: FilterOption[]
}

export function CatalogFilters({
  categories,
  collections,
}: CatalogFiltersProps) {
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

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          placeholder="Rechercher..."
          defaultValue={searchParams.get("q") ?? ""}
          onChange={(event) => debouncedSetSearch(event.target.value)}
          className="w-56 pl-8"
        />
      </div>

      <Select
        defaultValue={searchParams.get("categoryId") ?? "all"}
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
        defaultValue={searchParams.get("collectionId") ?? "all"}
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
        <SelectTrigger className="ml-auto w-48">
          <SelectValue placeholder="Trier par" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="createdAt_desc">Nouveautés</SelectItem>
          <SelectItem value="name_asc">Nom (A→Z)</SelectItem>
          <SelectItem value="name_desc">Nom (Z→A)</SelectItem>
          <SelectItem value="price_asc">Prix croissant</SelectItem>
          <SelectItem value="price_desc">Prix décroissant</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
