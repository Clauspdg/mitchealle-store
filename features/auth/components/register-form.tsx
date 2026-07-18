"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
} from "firebase/auth"
import { toast } from "sonner"

import { auth } from "@/firebase/client"
import { registerSchema, type RegisterInput } from "@/schemas/auth.schema"
import { getAuthErrorMessage } from "@/features/auth/lib/auth-error-messages"
import { syncSessionCookie } from "@/lib/session-client"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function RegisterForm() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      displayName: "",
      email: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
    },
  })

  async function onSubmit(data: RegisterInput) {
    setSubmitting(true)
    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      )
      await updateProfile(credential.user, { displayName: data.displayName })
      await sendEmailVerification(credential.user)

      const idToken = await credential.user.getIdToken()
      await syncSessionCookie(idToken)

      toast.success("Compte créé. Vérifiez votre email pour le confirmer.")
      router.push("/account")
    } catch (error) {
      toast.error(getAuthErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      noValidate
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="displayName">Nom</Label>
        <Input
          id="displayName"
          autoComplete="name"
          aria-invalid={!!errors.displayName}
          {...register("displayName")}
        />
        {errors.displayName ? (
          <p className="text-destructive text-sm">
            {errors.displayName.message}
          </p>
        ) : null}
      </div>

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

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Mot de passe</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.password}
          {...register("password")}
        />
        {errors.password ? (
          <p className="text-destructive text-sm">{errors.password.message}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.confirmPassword}
          {...register("confirmPassword")}
        />
        {errors.confirmPassword ? (
          <p className="text-destructive text-sm">
            {errors.confirmPassword.message}
          </p>
        ) : null}
      </div>

      <div className="flex items-start gap-2">
        <Checkbox
          id="acceptTerms"
          onCheckedChange={(checked) =>
            setValue("acceptTerms", checked === true, {
              shouldValidate: true,
            })
          }
        />
        <Label
          htmlFor="acceptTerms"
          className="text-muted-foreground font-normal"
        >
          J&apos;accepte les conditions d&apos;utilisation.
        </Label>
      </div>
      {errors.acceptTerms ? (
        <p className="text-destructive -mt-2 text-sm">
          {errors.acceptTerms.message}
        </p>
      ) : null}

      <Button type="submit" disabled={submitting} className="mt-2">
        {submitting ? "Création..." : "Créer mon compte"}
      </Button>
    </form>
  )
}
