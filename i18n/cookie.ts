import "server-only"
import { cookies } from "next/headers"

import {
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  type Locale,
} from "@/i18n/config"

/** Only from a Server Action or a Route Handler, where cookies can be set. */
export async function writeLocaleCookie(locale: Locale): Promise<void> {
  ;(await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: LOCALE_COOKIE_MAX_AGE,
  })
}
