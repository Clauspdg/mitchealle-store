import Link from "next/link"
import type { Metadata } from "next"

import { RegisterForm } from "@/features/auth/components/register-form"
import { GoogleSignInButton } from "@/features/auth/components/google-sign-in-button"
import { Separator } from "@/components/ui/separator"

export const metadata: Metadata = { title: "Créer un compte" }

export default function RegisterPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-xl font-semibold tracking-tight">
          Créer un compte
        </h1>
        <p className="text-muted-foreground text-sm">
          Rejoignez Mitchaella Store en quelques secondes.
        </p>
      </div>

      <RegisterForm />

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-muted-foreground text-xs">ou</span>
        <Separator className="flex-1" />
      </div>

      <GoogleSignInButton />

      <p className="text-muted-foreground text-center text-sm">
        Déjà un compte ?{" "}
        <Link
          href="/login"
          className="text-foreground underline underline-offset-4"
        >
          Se connecter
        </Link>
      </p>
    </div>
  )
}
