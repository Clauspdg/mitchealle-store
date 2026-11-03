import type { Metadata } from "next"

import { getFaqPage } from "@/services/firestore/content-pages"
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb"
import { getI18n } from "@/i18n/server"
import { localizeFaqPage } from "@/i18n/content-pages"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t("content.faq.title") }
}
export const dynamic = "force-dynamic"

export default async function FaqPage() {
  const page = localizeFaqPage(await getFaqPage(), await getI18n())

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12">
      <PageBreadcrumb items={[{ title: page.title }]} />
      <h1 className="font-heading text-3xl font-medium">{page.title}</h1>
      <div className="flex flex-col divide-y">
        {page.items.map((item, index) => (
          <div key={index} className="flex flex-col gap-2 py-5">
            <h2 className="font-medium">{item.question}</h2>
            <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">
              {item.answer}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
