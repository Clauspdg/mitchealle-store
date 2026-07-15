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
  { title: "Produits", href: "/admin/products", minimumRole: "staff" },
  { title: "Catégories", href: "/admin/categories", minimumRole: "staff" },
  { title: "Collections", href: "/admin/collections", minimumRole: "staff" },
  { title: "Stock", href: "/admin/stock", minimumRole: "staff" },
  { title: "Inventaire", href: "/admin/inventory", minimumRole: "staff" },
  { title: "Fournisseurs", href: "/admin/suppliers", minimumRole: "staff" },
  { title: "Arrivages", href: "/admin/shipments", minimumRole: "staff" },
]
