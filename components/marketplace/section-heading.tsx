import Link from "next/link"
import { ChevronRightIcon } from "lucide-react"
import { getI18n } from "@/i18n/server"

interface SectionHeadingProps {
  title: string
  href?: string
  linkLabel?: string
}

export async function SectionHeading({
  title,
  href,
  linkLabel,
}: SectionHeadingProps) {
  const { t } = await getI18n()
  return (
    <div className="mb-3 flex items-center justify-between gap-4 sm:mb-4">
      <h2 className="font-heading text-lg font-bold tracking-tight sm:text-2xl">
        {title}
      </h2>
      {href ? (
        <Link
          href={href}
          className="text-brand-blue dark:text-primary flex shrink-0 items-center gap-0.5 py-1 text-sm font-medium hover:underline"
        >
          {linkLabel ?? t("common.seeAll")}
          <ChevronRightIcon className="size-4" />
        </Link>
      ) : null}
    </div>
  )
}
