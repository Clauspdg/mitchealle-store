"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  HomeIcon,
  LayoutGridIcon,
  SearchIcon,
  ShoppingBagIcon,
  UserIcon,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { SITE_SEARCH_INPUT_ID } from "@/components/marketplace/marketplace-header"
import { useCartItemCount } from "@/features/cart/hooks/use-cart-item-count"

const ITEM_CLASSNAME =
  "relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[0.68rem] font-medium transition-colors"

/** Admin has its own navigation; checkout keeps the screen on the payment. */
const HIDDEN_PATH_PREFIXES = ["/admin", "/checkout"]

function NavLink({
  href,
  label,
  icon: Icon,
  isActive,
  badge,
}: {
  href: string
  label: string
  icon: LucideIcon
  isActive: boolean
  badge?: number
}) {
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        ITEM_CLASSNAME,
        isActive ? "text-primary" : "text-muted-foreground"
      )}
    >
      <span className="relative">
        <Icon className="size-5" />
        {badge ? (
          <span className="bg-accent-gold text-accent-gold-foreground absolute -top-1.5 -right-2 flex size-4 items-center justify-center rounded-full text-[10px] font-semibold">
            {badge > 9 ? "9+" : badge}
          </span>
        ) : null}
      </span>
      {label}
    </Link>
  )
}

export function MobileBottomNavigation() {
  const pathname = usePathname()
  const cartCount = useCartItemCount()

  if (HIDDEN_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null
  }

  function focusSearch() {
    window.scrollTo({ top: 0 })
    document.getElementById(SITE_SEARCH_INPUT_ID)?.focus()
  }

  return (
    <>
      {/* Keeps the end of the page (footer) clear of the fixed bar. */}
      <div aria-hidden className="h-14 md:hidden print:hidden" />
      <nav
        aria-label="Navigation principale"
        className="bg-background/95 fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden print:hidden"
      >
        <NavLink
          href="/"
          label="Accueil"
          icon={HomeIcon}
          isActive={pathname === "/"}
        />
        <NavLink
          href="/categories"
          label="Catégories"
          icon={LayoutGridIcon}
          isActive={pathname.startsWith("/categories")}
        />
        <button
          type="button"
          onClick={focusSearch}
          className={cn(ITEM_CLASSNAME, "text-muted-foreground")}
        >
          <SearchIcon className="size-5" />
          Recherche
        </button>
        <NavLink
          href="/cart"
          label="Panier"
          icon={ShoppingBagIcon}
          isActive={pathname.startsWith("/cart")}
          badge={cartCount}
        />
        <NavLink
          href="/account"
          label="Compte"
          icon={UserIcon}
          isActive={pathname.startsWith("/account")}
        />
      </nav>
    </>
  )
}
