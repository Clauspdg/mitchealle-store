import type { Metadata } from "next"

import { getContentPage } from "@/services/firestore/content-pages"
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb"
import { getI18n } from "@/i18n/server"
import { localizeContentPage } from "@/i18n/content-pages"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t("content.about.menuTitle") }
}
export const dynamic = "force-dynamic"

export default async function AboutPage() {
  const i18n = await getI18n()
  const page = localizeContentPage("about", await getContentPage("about"), i18n)

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12">
      <PageBreadcrumb items={[{ title: i18n.t("content.about.menuTitle") }]} />
      <h1 className="font-heading text-3xl font-medium">{page.title}</h1>
      <div className="text-muted-foreground flex flex-col gap-4 text-sm leading-relaxed sm:text-base">
        {page.sections.map((section, index) => (
          <div key={index} className="flex flex-col gap-2">
            {section.heading ? (
              <h2 className="font-heading text-foreground text-xl font-medium">
                {section.heading}
              </h2>
            ) : null}
            <p className="whitespace-pre-line">{section.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
