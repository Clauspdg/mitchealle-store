"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { DownloadIcon, SearchIcon } from "lucide-react"
import { toast } from "sonner"

import { useDebouncedCallback } from "@/hooks/use-debounced-callback"
import { exportActivityLogCsvAction } from "@/features/monitoring/actions/export-activity-log-action"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ACTIVITY_LOG_CATEGORIES } from "@/types/activity-log"

const CATEGORY_LABELS: Record<string, string> = {
  error: "Erreur",
  payment: "Paiement",
  refund: "Remboursement",
  coupon: "Coupon",
  notification: "Notification",
  admin_action: "Action admin",
}

export function ActivityLogToolbar() {
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
    const result = await exportActivityLogCsvAction({
      category: (searchParams.get("category") as never) ?? "all",
      search: searchParams.get("search") ?? "",
    })

    if (!result.success) {
      toast.error(result.error)
      return
    }

    const blob = new Blob([result.data], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `journal-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success("Export CSV généré.")
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          placeholder="Rechercher dans le journal..."
          defaultValue={searchParams.get("search") ?? ""}
          onChange={(event) => debouncedSetSearch(event.target.value)}
          className="w-64 pl-8"
        />
      </div>

      <Select
        value={searchParams.get("category") ?? "all"}
        onValueChange={(value) =>
          setParam("category", value === "all" ? null : value)
        }
      >
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes les catégories</SelectItem>
          {ACTIVITY_LOG_CATEGORIES.map((category) => (
            <SelectItem key={category} value={category}>
              {CATEGORY_LABELS[category] ?? category}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button variant="outline" onClick={handleExport}>
        <DownloadIcon />
        Exporter en CSV
      </Button>
    </div>
  )
}
