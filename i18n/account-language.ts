import "server-only"
import { cookies } from "next/headers"

import { adminDb } from "@/firebase/admin"
import { isLocale, LOCALE_COOKIE } from "@/i18n/config"
import { writeLocaleCookie } from "@/i18n/cookie"

/**
 * At sign-in: the language chosen on the account comes back to this
 * browser. An account with none yet (a new one) takes what was chosen in
 * this browser: the cookie only exists after an explicit choice.
 */
export async function syncLanguageWithAccount(uid: string): Promise<void> {
  const profile = adminDb.collection("users").doc(uid)
  const preferred = (await profile.get()).get("preferredLanguage")
  const chosenHere = (await cookies()).get(LOCALE_COOKIE)?.value
  if (isLocale(preferred)) {
    await writeLocaleCookie(preferred)
  } else if (isLocale(chosenHere)) {
    await profile.set({ preferredLanguage: chosenHere }, { merge: true })
  }
}
