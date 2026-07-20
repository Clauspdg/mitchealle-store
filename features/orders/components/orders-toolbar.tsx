"use client"

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
          defaultValue={searchParams.get("search") ?? ""}
          onChange={(event) => debouncedSetSearch(event.target.value)}
          className="w-64 pl-8"
        />
      </div>

      <Select
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
