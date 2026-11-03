"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { CheckIcon, LanguagesIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { setLocaleAction } from "@/i18n/actions"
import { useI18n } from "@/i18n/client"
import { LOCALE_NAMES, LOCALE_SHORT, LOCALES, type Locale } from "@/i18n/config"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/** Compact: a short code on the button, each language named in itself.
 * `onChange` lets a surrounding menu close once the language is set. */
export function LanguageSwitcher({
  className,
  onChange,
}: {
  className?: string
  onChange?: () => void
}) {
  const { t, locale } = useI18n()
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function choose(next: Locale) {
    if (next === locale) return
    startTransition(async () => {
      const result = await setLocaleAction(next)
      // Same URL, rendered again in the new language.
      if (result.success) {
        onChange?.()
        router.refresh()
      }
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            className={cn("h-10 gap-1 px-2 text-xs font-semibold", className)}
            aria-label={`${t("language.choose")} (${LOCALE_NAMES[locale]})`}
          />
        }
      >
        <LanguagesIcon className="size-4" />
        {LOCALE_SHORT[locale]}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LOCALES.map((option) => (
          <DropdownMenuItem
            key={option}
            lang={option}
            onClick={() => choose(option)}
            className="gap-2"
          >
            <CheckIcon
              className={cn("size-4", option === locale ? "" : "invisible")}
            />
            {LOCALE_NAMES[option]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
