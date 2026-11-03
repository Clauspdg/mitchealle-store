"use client"

import { createContext, useContext, useMemo } from "react"

import { DEFAULT_LOCALE, type Locale } from "@/i18n/config"
import { createTranslator, type Translator } from "@/i18n/translate"
import type { Messages } from "@/i18n/messages/en"

const I18nContext = createContext<{
  locale: Locale
  messages: Messages
} | null>(null)

/** The root layout passes the visitor's dictionary once: client components
 * read the same language the server rendered. */
export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale
  messages: Messages
  children: React.ReactNode
}) {
  const value = useMemo(() => ({ locale, messages }), [locale, messages])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): Translator {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error("useI18n must be used inside <I18nProvider>.")
  }
  const { locale, messages } = context
  // The dictionary is complete for every language (the types require it),
  // so it is its own fallback here: English isn't sent to the browser twice.
  return useMemo(
    () => createTranslator(locale, messages, messages),
    [locale, messages]
  )
}

export function useLocale(): Locale {
  return useContext(I18nContext)?.locale ?? DEFAULT_LOCALE
}
