import { DEFAULT_LOCALE, isLocale, type Locale } from "@/i18n/config"
import { createTranslator, type Translator } from "@/i18n/translate"
import { en, type Messages } from "@/i18n/messages/en"
import { fr } from "@/i18n/messages/fr"
import { ht } from "@/i18n/messages/ht"

const DICTIONARIES: Record<Locale, Messages> = { en, fr, ht }

export function messagesFor(locale: Locale): Messages {
  return DICTIONARIES[locale]
}

/** Outside a request, such as an email sent from a payment webhook. */
export function translatorFor(
  locale: unknown,
  fallback: Locale = DEFAULT_LOCALE
): Translator {
  const known = isLocale(locale) ? locale : fallback
  return createTranslator(known, DICTIONARIES[known], en)
}
