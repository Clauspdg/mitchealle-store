"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth"
import { toast } from "sonner"

import { auth } from "@/firebase/client"
import { getAuthErrorMessage } from "@/features/auth/lib/auth-error-messages"
import { Button } from "@/components/ui/button"

const provider = new GoogleAuthProvider()

export function GoogleSignInButton() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  async function handleClick() {
    setSubmitting(true)
    try {
      await signInWithPopup(auth, provider)
      toast.success("Connexion réussie.")
      router.push("/account")
      router.refresh()
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
