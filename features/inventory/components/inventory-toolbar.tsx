"use client"

import { useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { SearchIcon } from "lucide-react"

import { useDebouncedCallback } from "@/hooks/use-debounced-callback"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

// Base UI's `Select.Value` only resolves a value to its label from an
// explicit `items` map — without it the trigger shows the raw value (e.g.
// "updatedAt_desc") instead of its French label.
const SORT_ITEMS = {
  updatedAt_desc: "Dernière mise à jour",
  quantityAvailable_asc: "Disponible (croissant)",
  quantityAvailable_desc: "Disponible (décroissant)",
}

export function InventoryToolbar() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  // See products-toolbar.tsx: Base UI's `Input` FieldControl warns/resyncs
  // when `defaultValue` changes after mount, which happens on every
  // debounced keystroke if bound directly to `searchParams`. Local state is
  // the source of truth for what's typed.
  const [skuValue, setSkuValue] = useState(searchParams.get("sku") ?? "")

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete("cursor")
    router.push(`${pathname}?${params.toString()}`)
  }

  const debouncedSetSku = useDebouncedCallback(
    (value: string) => setParam("sku", value),
    300
  )

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative">
        <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          placeholder="Rechercher par SKU..."
          value={skuValue}
          onChange={(event) => {
            setSkuValue(event.target.value)
            debouncedSetSku(event.target.value)
          }}
          className="w-56 pl-8"
        />
      </div>

      <Select
        items={SORT_ITEMS}
        value={searchParams.get("sort") ?? "updatedAt_desc"}
        onValueChange={(value) => setParam("sort", value)}
      >
        <SelectTrigger className="w-56">
          <SelectValue placeholder="Trier par" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="updatedAt_desc">Dernière mise à jour</SelectItem>
          <SelectItem value="quantityAvailable_asc">
            Disponible (croissant)
          </SelectItem>
          <SelectItem value="quantityAvailable_desc">
            Disponible (décroissant)
          </SelectItem>
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2">
        <Switch
          id="lowStockOnly"
          checked={searchParams.get("lowStockOnly") === "true"}
          onCheckedChange={(checked) =>
            setParam("lowStockOnly", checked ? "true" : null)
          }
        />
        <Label htmlFor="lowStockOnly" className="font-normal">
          Stock faible uniquement
        </Label>
      </div>
    </div>
  )
}
