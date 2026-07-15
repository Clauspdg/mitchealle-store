"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { sendPasswordResetEmail } from "firebase/auth"
import { toast } from "sonner"

import { auth } from "@/firebase/client"
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/schemas/auth.schema"
import { getAuthErrorMessage } from "@/features/auth/lib/auth-error-messages"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function ForgotPasswordForm() {
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  async function onSubmit(data: ForgotPasswordInput) {
    setSubmitting(true)
    try {
      await sendPasswordResetEmail(auth, data.email)
      setSent(true)
    } catch (error) {
      // Firebase intentionally reports "user-not-found" here; we still show
      // the generic success state to avoid leaking which emails are registered.
      toast.error(getAuthErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  if (sent) {
    return (
      <p className="text-sm">
        Si un compte existe pour cet email, un lien de réinitialisation vient
        d&apos;être envoyé.
      </p>
    )
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      noValidate
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={!!errors.email}
          {...register("email")}
        />
        {errors.email ? (
          <p className="text-destructive text-sm">{errors.email.message}</p>
        ) : null}
      </div>

      <Button type="submit" disabled={submitting} className="mt-2">
        {submitting ? "Envoi..." : "Envoyer le lien de réinitialisation"}
      </Button>
    </form>
  )
}
