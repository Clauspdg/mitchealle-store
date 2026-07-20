import type { Metadata } from "next"

import { getContentPage } from "@/services/firestore/content-pages"
import { getStoreSettings } from "@/services/firestore/settings"
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb"

export const metadata: Metadata = {
  title: "Contact",
}
export const dynamic = "force-dynamic"

export default async function ContactPage() {
  const [page, settings] = await Promise.all([
    getContentPage("contact"),
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
              Email
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
              Téléphone
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
              Adresse
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
