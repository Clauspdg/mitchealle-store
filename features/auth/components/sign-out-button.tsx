"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signOut } from "firebase/auth"
import { toast } from "sonner"

import { auth } from "@/firebase/client"
import { useI18n } from "@/i18n/client"
import { Button } from "@/components/ui/button"

export function SignOutButton() {
  const { t } = useI18n()
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  async function handleClick() {
    setSubmitting(true)
    try {
      await signOut(auth)
      router.push("/")
      router.refresh()
    } catch {
      toast.error(t("auth.signOutFailed"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Button variant="ghost" disabled={submitting} onClick={handleClick}>
      {t("auth.signOut")}
    </Button>
  )
}
