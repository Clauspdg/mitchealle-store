/** Formats an amount stored in minor currency units (cents) as a display string, e.g. 1999 -> "19,99 $US". */
export function formatPriceMinor(
  amountMinor: number,
  currency: string,
  locale = "fr-FR"
): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(
    amountMinor / 100
  )
}
