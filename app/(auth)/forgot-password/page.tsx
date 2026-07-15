import Link from "next/link"
import type { Metadata } from "next"

import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form"

export const metadata: Metadata = { title: "Mot de passe oublié" }

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-xl font-semibold tracking-tight">
          Mot de passe oublié
        </h1>
        <p className="text-muted-foreground text-sm">
          Entrez votre email pour recevoir un lien de réinitialisation.
        </p>
      </div>

      <ForgotPasswordForm />

      <p className="text-muted-foreground text-center text-sm">
        <Link
          href="/login"
          className="text-foreground underline underline-offset-4"
        >
          Retour à la connexion
        </Link>
      </p>
    </div>
  )
}
