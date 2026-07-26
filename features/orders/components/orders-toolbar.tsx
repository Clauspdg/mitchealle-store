"use client"

import { useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { DownloadIcon, SearchIcon } from "lucide-react"
import { toast } from "sonner"

import { useDebouncedCallback } from "@/hooks/use-debounced-callback"
import { exportOrdersCsvAction } from "@/features/orders/actions/order-admin-actions"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ORDER_STATUSES } from "@/types/order"

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  paid: "Payée",
  processing: "En préparation",
  ready: "Prête à expédier",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
  refund_requested: "Remboursement demandé",
  refunded: "Remboursée",
}

export function OrdersToolbar() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  // Base UI's `Input` is a controlled-aware "FieldControl" that doesn't
  // silently ignore `defaultValue` changing after mount the way a plain
  // HTML input does — binding it to `searchParams` (which changes on every
  // debounced keystroke's URL update) trips its uncontrolled/controlled
  // resync warning. Local state is the source of truth for what's typed;
  // the URL update is just a debounced side effect.
  const [searchValue, setSearchValue] = useState(
    searchParams.get("search") ?? ""
  )

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete("cursor")
    router.push(`${pathname}?${params.toString()}`)
  }

  const debouncedSetSearch = useDebouncedCallback(
    (value: string) => setParam("search", value),
    300
  )

  // Base UI's `Select.Value` only resolves a value to its label from an
  // explicit `items` map — without it the trigger shows the raw value
  // (e.g. "refund_requested") instead of its French label.
  const statusItems = useMemo(
    () => ({
      all: "Tous les statuts",
      ...Object.fromEntries(
        ORDER_STATUSES.map((status) => [
          status,
          STATUS_LABELS[status] ?? status,
        ])
      ),
    }),
    []
  )
  const sortItems = useMemo(
    () => ({
      createdAt_desc: "Plus récentes",
      totalMinor_desc: "Montant décroissant",
    }),
    []
  )

  async function handleExport() {
    const result = await exportOrdersCsvAction({
      status: (searchParams.get("status") as never) ?? "all",
      search: searchParams.get("search") ?? "",
      sort: (searchParams.get("sort") as never) ?? "createdAt_desc",
    })

    if (!result.success) {
      toast.error(result.error)
      return
    }

    const blob = new Blob([result.data], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `commandes-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success("Export CSV généré.")
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          placeholder="N° de commande ou email..."
          value={searchValue}
          onChange={(event) => {
            setSearchValue(event.target.value)
            debouncedSetSearch(event.target.value)
          }}
          className="w-64 pl-8"
        />
      </div>

      <Select
        items={statusItems}
        value={searchParams.get("status") ?? "all"}
        onValueChange={(value) =>
          setParam("status", value === "all" ? null : value)
        }
      >
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les statuts</SelectItem>
          {ORDER_STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {STATUS_LABELS[status] ?? status}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        items={sortItems}
        value={searchParams.get("sort") ?? "createdAt_desc"}
        onValueChange={(value) => setParam("sort", value)}
      >
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="createdAt_desc">Plus récentes</SelectItem>
          <SelectItem value="totalMinor_desc">Montant décroissant</SelectItem>
        </SelectContent>
      </Select>

      <Button variant="outline" onClick={handleExport}>
        <DownloadIcon />
        Exporter en CSV
      </Button>
    </div>
  )
}
