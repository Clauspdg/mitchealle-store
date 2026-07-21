"use client"

import { useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { FilterIcon, SearchIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { useDebouncedCallback } from "@/hooks/use-debounced-callback"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet"
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

export function CatalogFilters(props: CatalogFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete("cursor")
    params.delete("pages")
    router.push(`${pathname}?${params.toString()}`)
  }

  function resetAll() {
    router.push(pathname)
  }

  const activeCount = [
    "categoryId",
    "collectionId",
    "brand",
    "size",
    "color",
    "gender",
    "priceMin",
    "priceMax",
    "onSale",
    "available",
  ].filter((key) => Boolean(searchParams.get(key))).length

  const debouncedSetMobileSearch = useDebouncedCallback(
    (value: string) => setParam("q", value || null),
    300
  )

  const shared = { ...props, searchParams, setParam }

  return (
    <div className="flex flex-col gap-3">
      {/* Desktop / tablet: inline toolbar, always visible. */}
      <div className="hidden sm:flex sm:flex-col sm:gap-3">
        <FilterFields {...shared} layout="inline" />
      </div>

      {/* Mobile: everything collapses behind a single "Filtres" trigger that
          opens a bottom sheet — the same `setParam`/URL mechanism applies
          changes live, the sheet is just a compact presentation shell. */}
      <div className="flex items-center gap-2 sm:hidden">
        <div className="relative flex-1">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            placeholder="Rechercher..."
            defaultValue={searchParams.get("q") ?? ""}
            onChange={(event) => debouncedSetMobileSearch(event.target.value)}
            className="h-11 pl-8"
          />
        </div>
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger
            render={
              <Button variant="outline" className="h-11 shrink-0 gap-1.5" />
            }
          >
            <FilterIcon className="size-4" />
            Filtres
            {activeCount > 0 ? (
              <span className="bg-accent-gold text-accent-gold-foreground ml-0.5 flex size-4 items-center justify-center rounded-full text-[0.65rem]">
                {activeCount}
              </span>
            ) : null}
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filtres</SheetTitle>
            </SheetHeader>
            <div className="px-4">
              <FilterFields {...shared} layout="stacked" />
            </div>
            <SheetFooter className="flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 flex-1"
                onClick={resetAll}
              >
                Réinitialiser
              </Button>
              <SheetClose
                render={<Button type="button" className="h-11 flex-1" />}
              >
                Appliquer
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  )
}

interface FilterFieldsProps extends CatalogFiltersProps {
  searchParams: URLSearchParams
  setParam: (key: string, value: string | null) => void
  layout: "inline" | "stacked"
}

/** Every filter control, shared between the desktop toolbar and the mobile
 * bottom sheet — only the wrapping layout differs between the two. */
function FilterFields({
  categories,
  collections,
  brands,
  sizes,
  colors,
  searchParams,
  setParam,
  layout,
}: FilterFieldsProps) {
  const stacked = layout === "stacked"
  const rowClass = stacked
    ? "flex flex-col gap-3"
    : "flex flex-wrap items-center gap-2"
  const fieldWidth = stacked ? "h-11 w-full" : ""

  const debouncedSetSearch = useDebouncedCallback(
    (value: string) => setParam("q", value),
    300
  )
  const debouncedSetPrice = useDebouncedCallback(
    (key: "priceMin" | "priceMax", value: string) => setParam(key, value),
    300
  )

  return (
    <>
      <div className={rowClass}>
        {!stacked ? (
          <div className="relative">
            <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              placeholder="Rechercher..."
              defaultValue={searchParams.get("q") ?? ""}
              onChange={(event) => debouncedSetSearch(event.target.value)}
              className="w-56 rounded-full pl-8"
            />
          </div>
        ) : null}

        {categories.length > 0 ? (
          <Select
            value={searchParams.get("categoryId") ?? "all"}
            onValueChange={(value) =>
              setParam("categoryId", value === "all" ? "" : value)
            }
          >
            <SelectTrigger
              className={cn(
                stacked ? "w-full" : "w-44 rounded-full",
                fieldWidth
              )}
              aria-label="Filtrer par catégorie"
            >
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
        ) : null}

        <Select
          value={searchParams.get("collectionId") ?? "all"}
          onValueChange={(value) =>
            setParam("collectionId", value === "all" ? "" : value)
          }
        >
          <SelectTrigger
            className={cn(stacked ? "w-full" : "w-44 rounded-full", fieldWidth)}
            aria-label="Filtrer par collection"
          >
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
            className={cn(
              stacked ? "w-full" : "ml-auto w-44 rounded-full",
              fieldWidth
            )}
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

      <div className={rowClass}>
        <div className={cn("flex items-center gap-2", stacked && "w-full")}>
          <Input
            type="number"
            min={0}
            placeholder="Prix min"
            defaultValue={searchParams.get("priceMin") ?? ""}
            onChange={(event) =>
              debouncedSetPrice("priceMin", event.target.value)
            }
            className={cn(
              stacked ? "h-11 w-full rounded-full" : "w-28 rounded-full"
            )}
          />
          <Input
            type="number"
            min={0}
            placeholder="Prix max"
            defaultValue={searchParams.get("priceMax") ?? ""}
            onChange={(event) =>
              debouncedSetPrice("priceMax", event.target.value)
            }
            className={cn(
              stacked ? "h-11 w-full rounded-full" : "w-28 rounded-full"
            )}
          />
        </div>

        {brands.length > 0 ? (
          <Select
            value={searchParams.get("brand") || "all"}
            onValueChange={(value) =>
              setParam("brand", value === "all" ? "" : value)
            }
          >
            <SelectTrigger
              className={cn(
                stacked ? "w-full" : "w-36 rounded-full",
                fieldWidth
              )}
              aria-label="Filtrer par marque"
            >
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
            <SelectTrigger
              className={cn(
                stacked ? "w-full" : "w-28 rounded-full",
                fieldWidth
              )}
              aria-label="Filtrer par taille"
            >
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
            <SelectTrigger
              className={cn(
                stacked ? "w-full" : "w-32 rounded-full",
                fieldWidth
              )}
              aria-label="Filtrer par couleur"
            >
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
          <SelectTrigger
            className={cn(stacked ? "w-full" : "w-28 rounded-full", fieldWidth)}
            aria-label="Filtrer par genre"
          >
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
            id={`filter-on-sale-${layout}`}
            checked={searchParams.get("onSale") === "1"}
            onCheckedChange={(checked) =>
              setParam("onSale", checked ? "1" : "")
            }
          />
          <Label
            htmlFor={`filter-on-sale-${layout}`}
            className="text-sm font-normal"
          >
            En promotion
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            id={`filter-available-${layout}`}
            checked={searchParams.get("available") === "1"}
            onCheckedChange={(checked) =>
              setParam("available", checked ? "1" : "")
            }
          />
          <Label
            htmlFor={`filter-available-${layout}`}
            className="text-sm font-normal"
          >
            En stock
          </Label>
        </div>
      </div>
    </>
  )
}
