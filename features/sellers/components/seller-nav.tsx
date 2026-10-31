"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

export interface SellerNavItem {
  title: string
  href: string
}

/** Sidebar from `md` up, a scrollable tab row on phones: the storefront's
 * bottom navigation is hidden in the Seller Center. */
export function SellerNav({
  items,
  rootHref,
}: {
  items: SellerNavItem[]
  rootHref: string
}) {
  const pathname = usePathname()
  const isActive = (href: string) =>
    pathname === href || (href !== rootHref && pathname.startsWith(`${href}/`))

  return (
    <>
      <aside className="bg-sidebar text-sidebar-foreground hidden w-56 shrink-0 border-r md:block">
        <nav className="flex flex-col gap-1 p-3" aria-label="Espace vendeur">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-2 text-sm",
                isActive(item.href)
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "hover:bg-sidebar-accent/50"
              )}
            >
              {item.title}
            </Link>
          ))}
        </nav>
      </aside>
      <nav
        className="flex [scrollbar-width:none] gap-1 overflow-x-auto border-b px-4 md:hidden [&::-webkit-scrollbar]:hidden"
        aria-label="Espace vendeur"
      >
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(item.href) ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2.5 text-sm whitespace-nowrap",
              isActive(item.href)
                ? "border-primary font-medium"
                : "text-muted-foreground border-transparent"
            )}
          >
            {item.title}
          </Link>
        ))}
      </nav>
    </>
  )
}
