"use client"

import { DownloadIcon } from "lucide-react"
import { toast } from "sonner"

import { exportAnalyticsAction } from "@/features/analytics/actions/export-analytics-action"
import { Button } from "@/components/ui/button"

function downloadBlob(content: string, mimeType: string, filename: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function ExportAnalyticsButtons({ rangeDays }: { rangeDays: number }) {
  async function handleExport(format: "csv" | "json") {
    const result = await exportAnalyticsAction(rangeDays, format)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    const date = new Date().toISOString().slice(0, 10)
    if (format === "csv") {
      downloadBlob(
        result.data,
        "text/csv;charset=utf-8;",
        `analytics-${date}.csv`
      )
    } else {
      downloadBlob(result.data, "application/json", `analytics-${date}.json`)
    }
    toast.success(`Export ${format.toUpperCase()} généré.`)
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => handleExport("csv")}>
        <DownloadIcon />
        CSV
      </Button>
      <Button variant="outline" size="sm" onClick={() => handleExport("json")}>
        <DownloadIcon />
        JSON
      </Button>
    </div>
  )
}
