"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { HeartIcon, MenuIcon, UserIcon } from "lucide-react"

import { marketplaceNav } from "@/config/nav"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import type { StoreSettings } from "@/types/settings"
import type { MenuItem } from "@/types/menu"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { BrandLogo } from "@/components/marketplace/brand-logo"
import { ModeToggle } from "@/components/shared/mode-toggle"
import { CartBadge } from "@/features/cart/components/cart-badge"
import { SignOutButton } from "@/features/auth/components/sign-out-button"
import { SearchCommand } from "@/features/search/components/search-command"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

const SCROLL_SHADOW_THRESHOLD = 8

export const SITE_SEARCH_INPUT_ID = "site-search-input"

function getInitials(label: string): string {
  return label.trim().slice(0, 2).toUpperCase()
}

export function MarketplaceHeader({
  storeSettings,
  mainNav,
}: {
  storeSettings: Omit<StoreSettings, "id" | "updatedAt">
  mainNav: MenuItem[]
}) {
  const { user, loading } = useAuth()
  const pathname = usePathname()
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    function onScroll() {
      setIsScrolled(window.scrollY > SCROLL_SHADOW_THRESHOLD)
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const initialsSource = user?.displayName || user?.email || "?"
  const isAdmin = pathname.startsWith("/admin")

  // The admin-managed header menu stays live: its entries follow the fixed
  // marketplace rail, minus the home link (the logo already does that job).
  const fixedHrefs = new Set(marketplaceNav.map((item) => item.href))
  const navLinks = [
    ...marketplaceNav,
    ...mainNav
      .filter((item) => item.href !== "/" && !fixedHrefs.has(item.href))
      .map((item) => ({ title: item.label, href: item.href })),
  ]

  return (
    <header
      className={cn(
        "bg-background sticky top-0 z-40 border-b transition-shadow duration-300",
        isScrolled ? "shadow-sm" : "shadow-none"
      )}
    >
      <div className="mx-auto grid max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-x-2 gap-y-2 px-4 py-2 md:gap-x-8 md:py-3">
        <div className="flex items-center gap-1">
          <Sheet>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="-ml-2 size-10 md:hidden"
                  aria-label="Ouvrir le menu"
                />
              }
            >
              <MenuIcon />
            </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle>{storeSettings.storeName}</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 overflow-y-auto px-4">
                {navLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="hover:bg-muted rounded-md px-3 py-2.5 text-sm"
                  >
                    {item.title}
                  </Link>
                ))}
                <div className="my-2 border-t" />
                <Link
                  href="/account/wishlist"
                  className="hover:bg-muted rounded-md px-3 py-2.5 text-sm"
                >
                  Liste de souhaits
                </Link>
                {!loading && !user ? (
                  <>
                    <Link
                      href="/login"
                      className="hover:bg-muted rounded-md px-3 py-2.5 text-sm"
                    >
                      Connexion
                    </Link>
                    <Link
                      href="/register"
                      className="hover:bg-muted rounded-md px-3 py-2.5 text-sm"
                    >
                      Inscription
                    </Link>
                  </>
                ) : null}
              </nav>
            </SheetContent>
          </Sheet>

          <Link href="/" aria-label={storeSettings.storeName}>
            <BrandLogo
              alt=""
              customSrc={storeSettings.logoUrl}
              preload
              className="h-7 md:h-9"
            />
          </Link>
        </div>

        <SearchCommand
          inputId={SITE_SEARCH_INPUT_ID}
          className="order-last col-span-3 mx-auto max-w-2xl md:order-none md:col-span-1"
        />

        <div className="col-span-2 flex items-center justify-end gap-0.5 md:col-span-1">
          <div className="hidden md:block">
            <ModeToggle />
          </div>

          <Button
            render={<Link href="/account/wishlist" />}
            nativeButton={false}
            variant="ghost"
            size="icon"
            className="hidden size-10 sm:inline-flex"
            aria-label="Liste de souhaits"
          >
            <HeartIcon />
          </Button>

          {loading ? (
            <Skeleton className="mx-1 size-8 rounded-full" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-10 rounded-full"
                    aria-label="Mon compte"
                  />
                }
              >
                <Avatar size="sm">
                  <AvatarFallback>{getInitials(initialsSource)}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem render={<Link href="/account" />}>
                  Mon compte
                </DropdownMenuItem>
                <DropdownMenuItem render={<Link href="/account/orders" />}>
                  Mes commandes
                </DropdownMenuItem>
                <DropdownMenuItem render={<Link href="/account/wishlist" />}>
                  Ma liste de souhaits
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div className="px-1.5 py-1">
                  <SignOutButton />
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button
                render={<Link href="/login" />}
                nativeButton={false}
                variant="ghost"
                size="icon"
                className="size-10 lg:hidden"
                aria-label="Connexion"
              >
                <UserIcon />
              </Button>
              <Button
                render={<Link href="/login" />}
                nativeButton={false}
                variant="ghost"
                className="hidden lg:inline-flex"
              >
                Connexion
              </Button>
              <Button
                render={<Link href="/register" />}
                nativeButton={false}
                className="hidden lg:inline-flex"
              >
                Inscription
              </Button>
            </>
          )}

          <CartBadge />
        </div>
      </div>

      {isAdmin ? null : (
        <nav
          aria-label="Navigation marketplace"
          className="hidden border-t md:block"
        >
          <div className="mx-auto flex max-w-7xl [scrollbar-width:none] items-center gap-6 overflow-x-auto px-4 [&::-webkit-scrollbar]:hidden">
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-muted-foreground hover:text-foreground py-2.5 text-sm font-medium whitespace-nowrap transition-colors"
              >
                {item.title}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  )
}
