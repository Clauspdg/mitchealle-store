"use client"

import { MoonIcon, SunIcon } from "lucide-react"
import { useTheme } from "next-themes"

import { useMounted } from "@/hooks/use-mounted"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ModeToggle() {
  const { setTheme } = useTheme()
  // Avoids a hydration mismatch: the resolved theme is only known client-side.
  const mounted = useMounted()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="Changer de thème" />
        }
      >
        {mounted ? (
          <>
            <SunIcon className="scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
            <MoonIcon className="absolute scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          </>
        ) : (
          <SunIcon />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>Clair</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>Sombre</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>Système</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
