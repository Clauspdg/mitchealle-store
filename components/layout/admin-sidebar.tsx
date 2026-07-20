"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { adminNav } from "@/config/nav"
import { useAuth } from "@/hooks/use-auth"
import { hasPermission } from "@/lib/permissions"
import { cn } from "@/lib/utils"

export function AdminSidebar() {
  const pathname = usePathname()
  const { role } = useAuth()

  // Sprint 10A — filters by the fixed capability matrix (`lib/permissions.ts`)
  // instead of a single role threshold, so `support` (ranked below `staff`)
  // still sees the sections its permission set actually grants (Orders,
  // Retours) without seeing catalog/settings sections it can't access.
  const items = adminNav.filter(
    (item) => role && hasPermission(role, item.permission)
  )

  return (
    <aside className="bg-sidebar text-sidebar-foreground hidden w-56 shrink-0 border-r md:block">
      <nav className="flex flex-col gap-1 p-3">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(`${item.href}/`))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "hover:bg-sidebar-accent/50"
              )}
            >
              {item.title}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
