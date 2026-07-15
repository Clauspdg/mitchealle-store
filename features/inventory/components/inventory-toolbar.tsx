"use client"

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

export function InventoryToolbar() {
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
          defaultValue={searchParams.get("sku") ?? ""}
          onChange={(event) => debouncedSetSku(event.target.value)}
          className="w-56 pl-8"
        />
      </div>

      <Select
        defaultValue={searchParams.get("sort") ?? "updatedAt_desc"}
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
