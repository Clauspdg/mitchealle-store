import type { Role } from "@/types/roles"

export interface NavItem {
  title: string
  href: string
}

/**
 * Intentionally minimal for Sprint 1 (foundations only) — no links to
 * catalog/checkout pages that don't exist yet. Expand as those features
 * land.
 */
export const mainNav: NavItem[] = [{ title: "Accueil", href: "/" }]

export const adminNav: Array<NavItem & { minimumRole: Role }> = [
  { title: "Tableau de bord", href: "/admin", minimumRole: "staff" },
]
