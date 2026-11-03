"use client"

import { useEffect, useSyncExternalStore } from "react"

import {
  DEFAULT_LOCALE,
  isLocale,
  LOCALE_COOKIE,
  type Locale,
} from "@/i18n/config"

// This page replaces the root layout, dictionary included: its few words
// are kept here.
const TEXT: Record<Locale, { title: string; text: string; retry: string }> = {
  en: {
    title: "A critical error occurred",
    text: "The application couldn't load. You can try again.",
    retry: "Try again",
  },
  fr: {
    title: "Une erreur critique est survenue",
    text: "L'application n'a pas pu se charger. Vous pouvez réessayer.",
    retry: "Réessayer",
  },
  ht: {
    title: "Gen yon gwo erè ki fèt",
    text: "Aplikasyon an pa t ka chaje. Ou ka eseye ankò.",
    retry: "Eseye ankò",
  },
}

function cookieLocale(): Locale {
  const value = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${LOCALE_COOKIE}=`))
    ?.split("=")[1]
  return isLocale(value) ? value : DEFAULT_LOCALE
}

const noSubscription = () => () => {}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // The server has no cookie to read here: English, then the visitor's
  // language once in the browser.
  const locale = useSyncExternalStore(
    noSubscription,
    cookieLocale,
    () => DEFAULT_LOCALE
  )

  useEffect(() => {
    console.error(error)
  }, [error])

  const text = TEXT[locale]

  return (
    <html lang={locale}>
      <body className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center font-sans">
        <h1 className="text-2xl font-semibold tracking-tight">{text.title}</h1>
        <p className="max-w-sm text-sm text-neutral-500">{text.text}</p>
        <button
          onClick={() => reset()}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white"
        >
          {text.retry}
        </button>
      </body>
    </html>
  )
}
