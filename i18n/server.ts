import "server-only"
import { cache } from "react"
import { cookies } from "next/headers"

import {
  DEFAULT_LOCALE,
  isLocale,
  LOCALE_COOKIE,
  type Locale,
} from "@/i18n/config"
import { translatorFor } from "@/i18n/dictionaries"
import type { Translator } from "@/i18n/translate"

export { messagesFor, translatorFor } from "@/i18n/dictionaries"

/** The visitor's language: their saved choice, or English. */
export const getLocale = cache(async (): Promise<Locale> => {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value
  return isLocale(value) ? value : DEFAULT_LOCALE
})

export const getI18n = cache(async (): Promise<Translator> =>
  translatorFor(await getLocale())
)
