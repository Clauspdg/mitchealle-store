"use client"

import { useState } from "react"

import {
  ViewToggle,
  type CatalogView,
} from "@/features/catalog/components/storefront/view-toggle"

interface CatalogViewSwitcherProps {
  /** Pre-rendered (Server Component) content for each view — passed as
   * opaque React nodes, never as raw product data, so no Firestore
   * `Timestamp` field ever has to cross the Server/Client boundary. */
  grid: React.ReactNode
  list: React.ReactNode
}

export function CatalogViewSwitcher({ grid, list }: CatalogViewSwitcherProps) {
  const [view, setView] = useState<CatalogView>("grid")

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <ViewToggle view={view} onChange={setView} />
      </div>
      {view === "grid" ? grid : list}
    </div>
  )
}
