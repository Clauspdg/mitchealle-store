import type { Metadata } from "next"

import { getContentPage } from "@/services/firestore/content-pages"
import { PageBreadcrumb } from "@/components/shared/page-breadcrumb"

export const metadata: Metadata = {
  title: "À propos",
}
export const dynamic = "force-dynamic"

export default async function AboutPage() {
  const page = await getContentPage("about")

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12">
      <PageBreadcrumb items={[{ title: "À propos" }]} />
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
