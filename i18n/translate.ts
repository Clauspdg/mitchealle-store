import { STORE_TIME } from "@/config/region"
import { currencyDisplay } from "@/config/currency"
import { DEFAULT_LOCALE, FORMAT_LOCALE, type Locale } from "@/i18n/config"
import type { Messages } from "@/i18n/messages/en"

export interface Plural {
  one: string
  other: string
}

type Leaves<T, Wanted> = {
  [K in keyof T & string]: T[K] extends Wanted
    ? K
    : T[K] extends string | Plural | readonly string[]
      ? never
      : `${K}.${Leaves<T[K], Wanted>}`
}[keyof T & string]

export type MessageKey = Leaves<Messages, string>
export type PluralKey = Leaves<Messages, Plural>
export type Params = Record<string, string | number>

const reported = new Set<string>()

function lookup(messages: unknown, key: string): unknown {
  let node = messages
  for (const part of key.split(".")) {
    if (!node || typeof node !== "object") return undefined
    node = (node as Record<string, unknown>)[part]
  }
  return node
}

function interpolate(text: string, params?: Params): string {
  if (!params) return text
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match
  )
}

export interface Translator {
  locale: Locale
  t: (key: MessageKey, params?: Params) => string
  /** `count` is passed to the text as `{count}`, formatted. */
  plural: (key: PluralKey, count: number, params?: Params) => string
  /** A message carried as a key, such as a validation error: shown
   * translated when it is one, as it is otherwise. */
  message: (value: string | undefined) => string
  price: (amountMinor: number, currency: string) => string
  number: (value: number, options?: Intl.NumberFormatOptions) => string
  date: (value: Date | number, style?: "short" | "long") => string
  dateTime: (value: Date | number) => string
}

/**
 * Looks a key up in the visitor's language, then in English, then shows the
 * key itself: a missing translation never breaks a page, and is reported
 * once.
 */
export function createTranslator(
  locale: Locale,
  messages: Messages,
  fallback: Messages
): Translator {
  const formatLocale = FORMAT_LOCALE[locale]
  const resolve = (key: string): unknown => {
    const found = lookup(messages, key)
    if (found !== undefined) return found
    if (!reported.has(`${locale}:${key}`)) {
      reported.add(`${locale}:${key}`)
      console.warn(`[i18n] missing "${key}" in ${locale}`)
    }
    return locale === DEFAULT_LOCALE ? undefined : lookup(fallback, key)
  }
  const number = (value: number, options?: Intl.NumberFormatOptions) =>
    new Intl.NumberFormat(formatLocale, options).format(value)

  const t = (key: MessageKey, params?: Params) => {
    const found = resolve(key)
    return typeof found === "string" ? interpolate(found, params) : key
  }

  const months = () => {
    const names = resolve("dates.months")
    return Array.isArray(names) ? (names as string[]) : null
  }

  return {
    locale,
    t,
    plural(key, count, params) {
      const found = resolve(key) as Plural | undefined
      if (!found || typeof found !== "object") return key
      // `Intl` has no rule for Creole: like English, one is singular.
      const rule =
        locale === "ht"
          ? count === 1
            ? "one"
            : "other"
          : new Intl.PluralRules(formatLocale).select(count)
      const text = rule === "one" ? found.one : found.other
      return interpolate(text, { ...params, count: number(count) })
    },
    message(value) {
      if (!value) return ""
      const found = lookup(messages, value) ?? lookup(fallback, value)
      return typeof found === "string" ? found : value
    },
    price(amountMinor, currency) {
      const display = currencyDisplay(currency)
      return new Intl.NumberFormat(formatLocale, {
        style: "currency",
        currency,
      })
        .formatToParts(amountMinor / 100)
        .map((part) =>
          part.type === "currency" && display ? display.symbol : part.value
        )
        .join("")
    },
    number,
    date(value, style = "short") {
      const date = new Date(value)
      if (style === "short") {
        return date.toLocaleDateString(formatLocale, {
          ...STORE_TIME,
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      }
      const names = locale === "ht" ? months() : null
      if (!names) {
        return date.toLocaleDateString(formatLocale, {
          ...STORE_TIME,
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      }
      const parts = Object.fromEntries(
        new Intl.DateTimeFormat("en-CA", {
          ...STORE_TIME,
          day: "numeric",
          month: "numeric",
          year: "numeric",
        })
          .formatToParts(date)
          .map((part) => [part.type, part.value])
      )
      return `${Number(parts.day)} ${names[Number(parts.month) - 1]} ${parts.year}`
    },
    dateTime(value) {
      return new Date(value).toLocaleString(formatLocale, {
        ...STORE_TIME,
        dateStyle: "short",
        timeStyle: "short",
      })
    },
  }
}
