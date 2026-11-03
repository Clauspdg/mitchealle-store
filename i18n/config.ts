export const LOCALES = ["en", "fr", "ht"] as const
export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = "en"

/** Holds an explicit choice only: with no cookie, a visitor gets English. */
export const LOCALE_COOKIE = "clag_locale"
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" && (LOCALES as readonly string[]).includes(value)
  )
}

/** Each language named in itself, so anyone can find their own. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  fr: "Français",
  ht: "Kreyòl ayisyen",
}

export const LOCALE_SHORT: Record<Locale, string> = {
  en: "EN",
  fr: "FR",
  ht: "HT",
}

/**
 * What `Intl` formats numbers, amounts and dates with. `Intl` has no data
 * for Haitian Creole: it would print English, so Creole uses Haiti's own
 * conventions (`fr-HT`) and takes its month names from its dictionary.
 */
export const FORMAT_LOCALE: Record<Locale, string> = {
  en: "en-BS",
  fr: "fr-FR",
  ht: "fr-HT",
}

export const OPEN_GRAPH_LOCALE: Record<Locale, string> = {
  en: "en_US",
  fr: "fr_FR",
  ht: "ht_HT",
}
