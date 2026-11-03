import { auth } from "@/firebase/client"
import type { Locale } from "@/i18n/config"

/** Firebase writes its own emails (verification, password reset) in this
 * language; one it has no template for falls back to its default. */
export function authEmailsIn(locale: Locale): void {
  auth.languageCode = locale
}
