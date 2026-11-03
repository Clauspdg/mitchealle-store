import type { Metadata } from "next"

import { getContentPage } from "@/services/firestore/content-pages"
import { getStoreSettings } from "@/services/firestore/settings"
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb"
import { getI18n } from "@/i18n/server"
import { localizeContentPage } from "@/i18n/content-pages"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t("content.contact.title") }
}
export const dynamic = "force-dynamic"

export default async function ContactPage() {
  const i18n = await getI18n()
  const { t } = i18n
  const [page, settings] = await Promise.all([
    getContentPage("contact").then((found) =>
      localizeContentPage("contact", found, i18n)
    ),
    getStoreSettings(),
  ])

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-12">
      <PageBreadcrumb items={[{ title: page.title }]} />
      <h1 className="font-heading text-3xl font-medium">{page.title}</h1>

      <div className="text-muted-foreground flex flex-col gap-4 text-sm leading-relaxed sm:text-base">
        {page.sections.map((section, index) => (
          <p key={index} className="whitespace-pre-line">
            {section.body}
          </p>
        ))}
      </div>

      <div className="grid gap-4 rounded-xl border p-6 sm:grid-cols-2">
        {settings.contactEmail ? (
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs uppercase">
              {t("auth.login.email")}
            </span>
            <a
              href={`mailto:${settings.contactEmail}`}
              className="hover:underline"
            >
              {settings.contactEmail}
            </a>
          </div>
        ) : null}
        {settings.contactPhone ? (
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs uppercase">
              {t("account.addresses.phone")}
            </span>
            <a
              href={`tel:${settings.contactPhone}`}
              className="hover:underline"
            >
              {settings.contactPhone}
            </a>
          </div>
        ) : null}
        {settings.whatsapp ? (
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs uppercase">
              WhatsApp
            </span>
            <span>{settings.whatsapp}</span>
          </div>
        ) : null}
        {settings.address.line1 ? (
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground text-xs uppercase">
              {t("account.addresses.address")}
            </span>
            <span>
              {settings.address.line1}, {settings.address.city}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
