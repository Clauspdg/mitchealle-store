"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth"
import { toast } from "sonner"

import { auth } from "@/firebase/client"
import { getAuthErrorMessage } from "@/features/auth/lib/auth-error-messages"
import { syncSessionCookie } from "@/lib/session-client"
import { Button } from "@/components/ui/button"

const provider = new GoogleAuthProvider()

export function GoogleSignInButton() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  async function handleClick() {
    setSubmitting(true)
    try {
      const credential = await signInWithPopup(auth, provider)
      const idToken = await credential.user.getIdToken()
      await syncSessionCookie(idToken)

      toast.success("Connexion réussie.")
      router.push("/account")
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
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
      Continuer avec Google
    </Button>
  )
}
