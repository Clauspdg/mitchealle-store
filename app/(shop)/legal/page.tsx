import type { Metadata } from "next"

import { getContentPage } from "@/services/firestore/content-pages"
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb"
import { getI18n } from "@/i18n/server"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t("content.legal.metaTitle") }
}
export const dynamic = "force-dynamic"

export default async function LegalPage() {
  const { t, locale } = await getI18n()
  // Legal text is shown as approved: never machine-translated here.
  const page = await getContentPage("legal")

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-12">
      <PageBreadcrumb items={[{ title: page.title }]} />
      <h1 className="font-heading text-3xl font-medium">{page.title}</h1>
      {locale === "fr" ? null : (
        <p
          lang={locale}
          className="bg-muted text-muted-foreground rounded-md p-3 text-sm"
        >
          {t("content.legal.frenchOnly")}
        </p>
      )}
      <div lang="fr" className="flex flex-col gap-10">
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
    </div>
  )
}
