"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { adminNav } from "@/config/nav"
import { useAuth } from "@/hooks/use-auth"
import { hasRoleAtLeast } from "@/types/roles"
import { cn } from "@/lib/utils"

export function AdminSidebar() {
  const pathname = usePathname()
  const { role } = useAuth()

  const items = adminNav.filter(
    (item) => role && hasRoleAtLeast(role, item.minimumRole)
  )

  return (
    <aside className="bg-sidebar text-sidebar-foreground hidden w-56 shrink-0 border-r md:block">
      <nav className="flex flex-col gap-1 p-3">
        {items.map((item) => {
          const active = pathname === item.href
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
