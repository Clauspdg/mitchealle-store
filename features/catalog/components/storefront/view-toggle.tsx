"use client"

import { LayoutGridIcon, LayoutListIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { useI18n } from "@/i18n/client"

export type CatalogView = "grid" | "list"

interface ViewToggleProps {
  view: CatalogView
  onChange: (view: CatalogView) => void
}

export function ViewToggle({ view, onChange }: ViewToggleProps) {
  const { t } = useI18n()
  return (
    <div className="bg-muted inline-flex items-center gap-0.5 rounded-full p-0.5">
      <button
        type="button"
        aria-label={t("catalog.view.grid")}
        aria-pressed={view === "grid"}
        onClick={() => onChange("grid")}
        className={cn(
          "flex size-8 items-center justify-center rounded-full transition-colors",
          view === "grid" ? "bg-background shadow-sm" : "text-muted-foreground"
        )}
      >
        <LayoutGridIcon className="size-4" />
      </button>
      <button
        type="button"
        aria-label={t("catalog.view.list")}
        aria-pressed={view === "list"}
        onClick={() => onChange("list")}
        className={cn(
          "flex size-8 items-center justify-center rounded-full transition-colors",
          view === "list" ? "bg-background shadow-sm" : "text-muted-foreground"
        )}
      >
        <LayoutListIcon className="size-4" />
      </button>
    </div>
  )
}
