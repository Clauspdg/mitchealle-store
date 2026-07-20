"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { HeartIcon, MenuIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import type { StoreSettings } from "@/types/settings"
import type { MenuItem } from "@/types/menu"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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

const SCROLL_SHRINK_THRESHOLD = 24

function getInitials(label: string): string {
  return label.trim().slice(0, 2).toUpperCase()
}

export function Header({
  storeSettings,
  mainNav,
}: {
  storeSettings: Omit<StoreSettings, "id" | "updatedAt">
  mainNav: MenuItem[]
}) {
  const { user, loading } = useAuth()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  useEffect(() => {
    function onScroll() {
      setIsScrolled(window.scrollY > SCROLL_SHRINK_THRESHOLD)
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const initialsSource = user?.displayName || user?.email || "?"

  return (
    <header
      className={cn(
        "bg-background/80 sticky top-0 z-40 border-b backdrop-blur transition-[height,box-shadow] duration-300",
        isScrolled ? "shadow-sm" : "shadow-none"
      )}
    >
      <div
        className={cn(
          "mx-auto grid max-w-6xl grid-cols-[auto_1fr_auto] items-center gap-4 px-4 transition-[height] duration-300",
          isScrolled ? "h-12" : "h-16"
        )}
      >
        <div className="flex items-center gap-3">
          <Sheet>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
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
              <nav className="flex flex-col gap-1 px-4">
                {mainNav.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="hover:bg-muted rounded-md px-3 py-2 text-sm"
                  >
                    {item.label}
                  </Link>
                ))}
                {!loading && !user ? (
                  <>
                    <div className="my-2 border-t" />
                    <Link
                      href="/login"
                      className="hover:bg-muted rounded-md px-3 py-2 text-sm"
                    >
                      Connexion
                    </Link>
                    <Link
                      href="/register"
                      className="hover:bg-muted rounded-md px-3 py-2 text-sm"
                    >
                      Inscription
                    </Link>
                  </>
                ) : null}
              </nav>
            </SheetContent>
          </Sheet>

          <Link
            href="/"
            className="font-heading flex items-center gap-2 text-xl font-semibold tracking-tight"
          >
            {storeSettings.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- external Storage URL
              <img
                src={storeSettings.logoUrl}
                alt={storeSettings.storeName}
                className="h-8 w-auto object-contain"
              />
            ) : null}
            {storeSettings.storeName}
          </Link>
        </div>

        <nav className="hidden items-center justify-center gap-6 md:flex">
          {mainNav.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center justify-end gap-1">
          <div className="hidden sm:block">
            <SearchCommand
              isOpen={isSearchOpen}
              onOpenChange={setIsSearchOpen}
            />
          </div>

          <ModeToggle />

          <Button
            render={<Link href="/account/wishlist" />}
            nativeButton={false}
            variant="ghost"
            size="icon"
            aria-label="Liste de souhaits"
          >
            <HeartIcon />
          </Button>

          <CartBadge />

          {loading ? (
            <Skeleton className="h-8 w-8 rounded-full" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
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
                variant="ghost"
                nativeButton={false}
                className="hidden sm:inline-flex"
              >
                Connexion
              </Button>
              <Button
                render={<Link href="/register" />}
                nativeButton={false}
                className="hidden sm:inline-flex"
              >
                Inscription
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
