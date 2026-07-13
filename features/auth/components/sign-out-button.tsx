"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signOut } from "firebase/auth"
import { toast } from "sonner"

import { auth } from "@/firebase/client"
import { Button } from "@/components/ui/button"

export function SignOutButton() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  async function handleClick() {
    setSubmitting(true)
    try {
      await signOut(auth)
      router.push("/")
      router.refresh()
    } catch {
      toast.error("La déconnexion a échoué. Réessayez.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Button variant="ghost" disabled={submitting} onClick={handleClick}>
      Déconnexion
    </Button>
  )
}
