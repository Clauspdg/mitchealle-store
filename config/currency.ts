/**
 * C.L.A.G sells in Bahamian dollars. `settings/store.currency` decides what
 * a store really sells in; this is its value on a fresh store.
 */
export const REFERENCE_CURRENCY = "BSD"

/**
 * What every amount was recorded in before the Bahamas launch. Those amounts
 * are never converted: an order keeps its own currency, and an amount with
 * no currency of its own (an older coupon) is read as HTG.
 */
export const LEGACY_CURRENCY = "HTG"

/** Currencies whose usual sign is not what `Intl` prints. */
const DISPLAY: Record<string, { symbol: string; locale: string }> = {
  BSD: { symbol: "B$", locale: "en-BS" },
}

export function currencyDisplay(currency: string) {
  return DISPLAY[currency] ?? null
}
