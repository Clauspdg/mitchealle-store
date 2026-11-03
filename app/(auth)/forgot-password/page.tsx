import Link from "next/link"
import type { Metadata } from "next"

import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form"
import { getI18n } from "@/i18n/server"
import { safeRedirectPath } from "@/lib/safe-redirect"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t("auth.forgot.metaTitle") }
}

export default async function ForgotPasswordPage({
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
          {t("auth.forgot.title")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t("auth.forgot.subtitle")}
        </p>
      </div>

      <ForgotPasswordForm />

      <p className="text-muted-foreground text-center text-sm">
        <Link
          href={`/login${keep}`}
          className="text-foreground underline underline-offset-4"
        >
          {t("auth.forgot.backToLogin")}
        </Link>
      </p>
    </div>
  )
}
