"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { SearchIcon } from "lucide-react"

import { useDebouncedCallback } from "@/hooks/use-debounced-callback"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
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
  brands: string[]
  sizes: string[]
  colors: string[]
}

const GENDER_OPTIONS = [
  { value: "femme", label: "Femme" },
  { value: "homme", label: "Homme" },
  { value: "unisexe", label: "Unisexe" },
]

export function CatalogFilters({
  categories,
  collections,
  brands,
  sizes,
  colors,
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
  const debouncedSetPrice = useDebouncedCallback(
    (key: "priceMin" | "priceMax", value: string) => setParam(key, value),
    300
  )

  return (
    <div className="flex flex-col gap-3">
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
          value={searchParams.get("categoryId") ?? "all"}
          onValueChange={(value) =>
            setParam("categoryId", value === "all" ? "" : value)
          }
        >
          <SelectTrigger className="w-48" aria-label="Filtrer par catégorie">
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
          value={searchParams.get("collectionId") ?? "all"}
          onValueChange={(value) =>
            setParam("collectionId", value === "all" ? "" : value)
          }
        >
          <SelectTrigger className="w-48" aria-label="Filtrer par collection">
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
          value={searchParams.get("sort") ?? "createdAt_desc"}
          onValueChange={(value) => setParam("sort", value)}
        >
          <SelectTrigger
            className="ml-auto w-48"
            aria-label="Trier les produits"
          >
            <SelectValue placeholder="Trier par" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt_desc">Nouveautés</SelectItem>
            <SelectItem value="popularity_desc">Popularité</SelectItem>
            <SelectItem value="name_asc">Nom (A→Z)</SelectItem>
            <SelectItem value="name_desc">Nom (Z→A)</SelectItem>
            <SelectItem value="price_asc">Prix croissant</SelectItem>
            <SelectItem value="price_desc">Prix décroissant</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="number"
          min={0}
          placeholder="Prix min"
          defaultValue={searchParams.get("priceMin") ?? ""}
          onChange={(event) =>
            debouncedSetPrice("priceMin", event.target.value)
          }
          className="w-28"
        />
        <Input
          type="number"
          min={0}
          placeholder="Prix max"
          defaultValue={searchParams.get("priceMax") ?? ""}
          onChange={(event) =>
            debouncedSetPrice("priceMax", event.target.value)
          }
          className="w-28"
        />

        {brands.length > 0 ? (
          <Select
            value={searchParams.get("brand") || "all"}
            onValueChange={(value) =>
              setParam("brand", value === "all" ? "" : value)
            }
          >
            <SelectTrigger className="w-40" aria-label="Filtrer par marque">
              <SelectValue placeholder="Marque" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les marques</SelectItem>
              {brands.map((brand) => (
                <SelectItem key={brand} value={brand}>
                  {brand}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        {sizes.length > 0 ? (
          <Select
            value={searchParams.get("size") || "all"}
            onValueChange={(value) =>
              setParam("size", value === "all" ? "" : value)
            }
          >
            <SelectTrigger className="w-32" aria-label="Filtrer par taille">
              <SelectValue placeholder="Taille" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes tailles</SelectItem>
              {sizes.map((size) => (
                <SelectItem key={size} value={size}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        {colors.length > 0 ? (
          <Select
            value={searchParams.get("color") || "all"}
            onValueChange={(value) =>
              setParam("color", value === "all" ? "" : value)
            }
          >
            <SelectTrigger className="w-36" aria-label="Filtrer par couleur">
              <SelectValue placeholder="Couleur" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes couleurs</SelectItem>
              {colors.map((color) => (
                <SelectItem key={color} value={color}>
                  {color}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        <Select
          value={searchParams.get("gender") || "all"}
          onValueChange={(value) =>
            setParam("gender", value === "all" ? "" : value)
          }
        >
          <SelectTrigger className="w-32" aria-label="Filtrer par genre">
            <SelectValue placeholder="Sexe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            {GENDER_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Switch
            id="filter-on-sale"
            checked={searchParams.get("onSale") === "1"}
            onCheckedChange={(checked) =>
              setParam("onSale", checked ? "1" : "")
            }
          />
          <Label htmlFor="filter-on-sale" className="text-sm font-normal">
            En promotion
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            id="filter-available"
            checked={searchParams.get("available") === "1"}
            onCheckedChange={(checked) =>
              setParam("available", checked ? "1" : "")
            }
          />
          <Label htmlFor="filter-available" className="text-sm font-normal">
            En stock
          </Label>
        </div>
      </div>
    </div>
  )
}
