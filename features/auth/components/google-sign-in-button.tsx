"use client"

import { useState } from "react"
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth"
import { toast } from "sonner"

import { auth } from "@/firebase/client"
import { getAuthErrorMessage } from "@/features/auth/lib/auth-error-messages"
import { useI18n } from "@/i18n/client"
import { syncSessionCookie } from "@/lib/session-client"
import { Button } from "@/components/ui/button"

const provider = new GoogleAuthProvider()

/** `redirectTo` is already checked by `safeRedirectPath` on the page:
 * the visitor goes back to what they were doing, not to their account. */
export function GoogleSignInButton({
  redirectTo = "/",
}: {
  redirectTo?: string
}) {
  const { t } = useI18n()
  const [submitting, setSubmitting] = useState(false)

  async function handleClick() {
    setSubmitting(true)
    try {
      const credential = await signInWithPopup(auth, provider)
      const idToken = await credential.user.getIdToken()
      await syncSessionCookie(idToken)

      toast.success(t("auth.login.success"))
      // A full navigation: the next page is rendered with the new session
      // cookie, and the auth page can't redirect in between.
      window.location.assign(redirectTo)
    } catch (error) {
      toast.error(t(getAuthErrorMessage(error)))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      disabled={submitting}
      onClick={handleClick}
    >
      {t("auth.google")}
    </Button>
  )
}
