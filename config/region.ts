/**
 * Launch market. A new store, and anything without a saved value of its own,
 * starts from these; saved settings, addresses and other countries stay
 * as they are.
 */
export const LAUNCH_REGION = {
  country: "BS",
  countryName: "Bahamas",
  timezone: "America/Nassau",
  language: "en",
  locale: "en-BS",
  phonePrefix: "+1 242",
} as const

/** Passed to date formatters: dates read the same on the server and in any
 * browser. */
export const STORE_TIME = { timeZone: LAUNCH_REGION.timezone }

/** Inhabited islands, offered as suggestions: smaller cays are typed in. */
export const BAHAMAS_ISLANDS = [
  "New Providence",
  "Grand Bahama",
  "Abaco",
  "Acklins",
  "Andros",
  "Berry Islands",
  "Bimini",
  "Cat Island",
  "Crooked Island",
  "Eleuthera",
  "Exuma",
  "Harbour Island",
  "Inagua",
  "Long Island",
  "Mayaguana",
  "Ragged Island",
  "Rum Cay",
  "San Salvador",
  "Spanish Wells",
] as const

/** Enough digits for a whole number: the pre-filled prefix alone is not. */
export function isPhoneNumber(value: string): boolean {
  return value.replace(/\D/g, "").length >= 7
}

/** `2026-11-02`, the calendar day at the store. */
export function storeDay(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    ...STORE_TIME,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}
