import type { FirestoreTimestamp } from "./firestore"

export const MENU_IDS = ["header", "footer"] as const
export type MenuId = (typeof MENU_IDS)[number]

export interface MenuItem {
  id: string
  label: string
  /** Empty string for a non-clickable group header (footer only). */
  href: string
  position: number
  /** One level of nesting only — `null` for a top-level item/group. */
  parentId: string | null
}

/** Exact shape of a `menus/{menuId}` document (`menus/header`, `menus/footer`). */
export interface MenuDocument {
  items: MenuItem[]
  updatedAt: FirestoreTimestamp
  updatedBy: string | null
}

export interface Menu extends MenuDocument {
  id: MenuId
}
