import type { Metadata } from "next"

import { getContentPage } from "@/services/firestore/content-pages"
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb"

export const metadata: Metadata = {
  title: "Confidentialité & Conditions",
}
export const dynamic = "force-dynamic"

export default async function LegalPage() {
  const page = await getContentPage("legal")

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-12">
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
