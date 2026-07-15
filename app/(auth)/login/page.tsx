import Link from "next/link"
import type { Metadata } from "next"

import { LoginForm } from "@/features/auth/components/login-form"
import { GoogleSignInButton } from "@/features/auth/components/google-sign-in-button"
import { Separator } from "@/components/ui/separator"

export const metadata: Metadata = { title: "Connexion" }

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Connexion</h1>
        <p className="text-muted-foreground text-sm">
          Accédez à votre compte Mitchaella Store.
        </p>
      </div>

      <LoginForm />

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-muted-foreground text-xs">ou</span>
        <Separator className="flex-1" />
      </div>

      <GoogleSignInButton />

      <div className="text-muted-foreground flex flex-col items-center gap-1 text-sm">
        <Link
          href="/forgot-password"
          className="hover:text-foreground underline underline-offset-4"
        >
          Mot de passe oublié ?
        </Link>
        <p>
          Pas encore de compte ?{" "}
          <Link
            href="/register"
            className="text-foreground underline underline-offset-4"
          >
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  )
}
