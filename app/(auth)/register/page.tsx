import Link from "next/link"
import type { Metadata } from "next"

import { RegisterForm } from "@/features/auth/components/register-form"
import { GoogleSignInButton } from "@/features/auth/components/google-sign-in-button"
import { Separator } from "@/components/ui/separator"
import { safeRedirectPath } from "@/lib/safe-redirect"
import { getI18n } from "@/i18n/server"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t("auth.register.metaTitle") }
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string | string[] }>
}) {
  const { t } = await getI18n()
  const redirectTo = safeRedirectPath((await searchParams).redirect)
  const keep =
    redirectTo === "/" ? "" : `?redirect=${encodeURIComponent(redirectTo)}`

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-xl font-semibold tracking-tight">
          {t("auth.register.title")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t("auth.register.subtitle")}
        </p>
      </div>

      <RegisterForm redirectTo={redirectTo} />

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-muted-foreground text-xs">{t("common.or")}</span>
        <Separator className="flex-1" />
      </div>

      <GoogleSignInButton redirectTo={redirectTo} />

      <p className="text-muted-foreground text-center text-sm">
        {t("auth.register.haveAccount")}{" "}
        <Link
          href={`/login${keep}`}
          className="text-foreground underline underline-offset-4"
        >
          {t("auth.register.signIn")}
        </Link>
      </p>
    </div>
  )
}
