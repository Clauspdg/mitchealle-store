"use client"

import { useState } from "react"
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
import { APPLICATION_STATUS_LABELS } from "@/features/sellers/lib/seller-labels"
import { SELLER_APPLICATION_STATUSES } from "@/types/seller"

const STATUS_ITEMS = { all: "Tous les statuts", ...APPLICATION_STATUS_LABELS }

/** Same URL-driven pattern as `OrdersToolbar`. */
export function SellerApplicationsToolbar() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [searchValue, setSearchValue] = useState(
    searchParams.get("search") ?? ""
  )

  // The status Select can report its current value again while the page is
  // leaving for another route; pushing then would drag the admin back to
  // this list. Only a real change navigates.
  function setParam(key: string, value: string | null) {
    if ((searchParams.get(key) ?? null) === (value || null)) return
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`${pathname}?${params.toString()}`)
  }

  const debouncedSetSearch = useDebouncedCallback(
    (value: string) => setParam("search", value),
    300
  )

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          placeholder="Boutique ou email..."
          aria-label="Rechercher une candidature"
          value={searchValue}
          onChange={(event) => {
            setSearchValue(event.target.value)
            debouncedSetSearch(event.target.value)
          }}
          className="w-64 pl-8"
        />
      </div>
      <Select
        items={STATUS_ITEMS}
        value={searchParams.get("status") ?? "all"}
        onValueChange={(value) =>
          setParam("status", !value || value === "all" ? null : value)
        }
      >
        <SelectTrigger className="w-44" aria-label="Filtrer par statut">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les statuts</SelectItem>
          {SELLER_APPLICATION_STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {APPLICATION_STATUS_LABELS[status]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
