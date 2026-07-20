import type { Role } from "@/types/roles"
import type { PermissionKey } from "@/lib/permissions"

export interface NavItem {
  title: string
  href: string
}

export const mainNav: NavItem[] = [
  { title: "Accueil", href: "/" },
  { title: "Produits", href: "/products" },
  { title: "Collections", href: "/collections" },
]

export const adminNav: Array<
  NavItem & { minimumRole: Role; permission: PermissionKey }
> = [
  {
    title: "Tableau de bord",
    href: "/admin",
    minimumRole: "staff",
    permission: "dashboard",
  },
  {
    title: "Commandes",
    href: "/admin/orders",
    minimumRole: "staff",
    permission: "orders",
  },
  {
    title: "Produits",
    href: "/admin/products",
    minimumRole: "staff",
    permission: "products",
  },
  {
    title: "Catégories",
    href: "/admin/categories",
    minimumRole: "staff",
    permission: "categories",
  },
  {
    title: "Collections",
    href: "/admin/collections",
    minimumRole: "staff",
    permission: "collections",
  },
  {
    title: "Marques",
    href: "/admin/brands",
    minimumRole: "staff",
    permission: "brands",
  },
  {
    title: "Coupons",
    href: "/admin/coupons",
    minimumRole: "staff",
    permission: "coupons",
  },
  {
    title: "Retours",
    href: "/admin/returns",
    minimumRole: "staff",
    permission: "returns",
  },
  {
    title: "Stock",
    href: "/admin/stock",
    minimumRole: "staff",
    permission: "stock",
  },
  {
    title: "Inventaire",
    href: "/admin/inventory",
    minimumRole: "staff",
    permission: "inventory",
  },
  {
    title: "Fournisseurs",
    href: "/admin/suppliers",
    minimumRole: "staff",
    permission: "suppliers",
  },
  {
    title: "Arrivages",
    href: "/admin/shipments",
    minimumRole: "staff",
    permission: "shipments",
  },
  {
    title: "Journal",
    href: "/admin/logs",
    minimumRole: "staff",
    permission: "logs",
  },
  {
    title: "Utilisateurs",
    href: "/admin/users",
    minimumRole: "admin",
    permission: "users",
  },
  {
    title: "Paramètres boutique",
    href: "/admin/settings/store",
    minimumRole: "admin",
    permission: "settingsStore",
  },
  {
    title: "Paramètres e-commerce",
    href: "/admin/settings/ecommerce",
    minimumRole: "admin",
    permission: "settingsEcommerce",
  },
  {
    title: "Bannières",
    href: "/admin/settings/banners",
    minimumRole: "staff",
    permission: "banners",
  },
  {
    title: "Page d'accueil",
    href: "/admin/settings/homepage",
    minimumRole: "staff",
    permission: "homepage",
  },
  {
    title: "Médiathèque",
    href: "/admin/media",
    minimumRole: "staff",
    permission: "media",
  },
  {
    title: "Contenu du site",
    href: "/admin/content",
    minimumRole: "staff",
    permission: "content",
  },
  {
    title: "Menus",
    href: "/admin/menus",
    minimumRole: "staff",
    permission: "menus",
  },
]
