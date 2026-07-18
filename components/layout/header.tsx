"use client"

import Link from "next/link"
import { MenuIcon } from "lucide-react"

import { siteConfig } from "@/config/site"
import { mainNav } from "@/config/nav"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ModeToggle } from "@/components/shared/mode-toggle"
import { CartBadge } from "@/features/cart/components/cart-badge"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

export function Header() {
  const { user, loading } = useAuth()

  return (
    <header className="bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
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
              <SheetTitle>{siteConfig.name}</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 px-4">
              {mainNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="hover:bg-muted rounded-md px-3 py-2 text-sm"
                >
                  {item.title}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>

        <Link
          href="/"
          className="font-heading text-lg font-medium tracking-tight"
        >
          {siteConfig.name}
        </Link>

        <nav className="hidden flex-1 items-center gap-4 md:flex">
          {mainNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-muted-foreground hover:text-foreground text-sm"
            >
              {item.title}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ModeToggle />
          <CartBadge />

          {loading ? (
            <Skeleton className="h-8 w-20 rounded-md" />
          ) : user ? (
            <Button
              render={<Link href="/account" />}
              variant="ghost"
              nativeButton={false}
            >
              Mon compte
            </Button>
          ) : (
            <>
              <Button
                render={<Link href="/login" />}
                variant="ghost"
                nativeButton={false}
              >
                Connexion
              </Button>
              <Button render={<Link href="/register" />} nativeButton={false}>
                Inscription
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
