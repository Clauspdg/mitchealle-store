import { currencyDisplay } from "@/config/currency"

/** Formats an amount stored in minor currency units (cents) as a display string, e.g. 1999 -> "19,99 $US", or "B$19.99" in BSD. */
export function formatPriceMinor(
  amountMinor: number,
  currency: string,
  locale?: string
): string {
  const display = currencyDisplay(currency)
  return new Intl.NumberFormat(locale ?? display?.locale ?? "fr-FR", {
    style: "currency",
    currency,
  })
    .formatToParts(amountMinor / 100)
    .map((part) =>
      part.type === "currency" && display ? display.symbol : part.value
    )
    .join("")
}
