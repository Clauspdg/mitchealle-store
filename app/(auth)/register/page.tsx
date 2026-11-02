import Link from "next/link"
import type { Metadata } from "next"

import { RegisterForm } from "@/features/auth/components/register-form"
import { GoogleSignInButton } from "@/features/auth/components/google-sign-in-button"
import { Separator } from "@/components/ui/separator"
import { safeRedirectPath } from "@/lib/safe-redirect"

export const metadata: Metadata = { title: "Créer un compte" }

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string | string[] }>
}) {
  const redirectTo = safeRedirectPath((await searchParams).redirect)
  const keep =
    redirectTo === "/" ? "" : `?redirect=${encodeURIComponent(redirectTo)}`

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-xl font-semibold tracking-tight">
          Créer un compte
        </h1>
        <p className="text-muted-foreground text-sm">
          Rejoignez C.L.A.G en quelques secondes.
        </p>
      </div>

      <RegisterForm redirectTo={redirectTo} />

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-muted-foreground text-xs">ou</span>
        <Separator className="flex-1" />
      </div>

      <GoogleSignInButton redirectTo={redirectTo} />

      <p className="text-muted-foreground text-center text-sm">
        Déjà un compte ?{" "}
        <Link
          href={`/login${keep}`}
          className="text-foreground underline underline-offset-4"
        >
          Se connecter
        </Link>
      </p>
    </div>
  )
}
