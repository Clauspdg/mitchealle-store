import type { Metadata } from "next"

import { getContentPage } from "@/services/firestore/content-pages"
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb"
import { getI18n } from "@/i18n/server"
import { localizeContentPage } from "@/i18n/content-pages"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t("content.shippingReturns.title") }
}
export const dynamic = "force-dynamic"

export default async function ShippingReturnsPage() {
  const i18n = await getI18n()
  const page = localizeContentPage(
    "shipping-returns",
    await getContentPage("shipping-returns"),
    i18n
  )

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-12">
      <PageBreadcrumb items={[{ title: page.title }]} />
      <h1 className="font-heading text-3xl font-medium">{page.title}</h1>

      {page.sections.map((section, index) => (
        <section key={index} className="flex flex-col gap-3">
          {section.heading ? (
            <h2 className="font-heading text-xl font-medium">
              {section.heading}
            </h2>
          ) : null}
          <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line sm:text-base">
            {section.body}
          </p>
        </section>
      ))}
    </div>
  )
}
