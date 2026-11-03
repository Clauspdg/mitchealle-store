import Image from "next/image"
import Link from "next/link"

import type { Collection } from "@/types/collection"
import { SectionHeading } from "@/components/marketplace/section-heading"
import { Reveal } from "@/components/shared/reveal"
import { ReadableOverlay } from "@/components/shared/readable-overlay"
import { getI18n } from "@/i18n/server"

interface CollectionsShowcaseProps {
  collections: Collection[]
}

export async function CollectionsShowcase({
  collections,
}: CollectionsShowcaseProps) {
  const { t } = await getI18n()
  if (collections.length === 0) return null

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-4 sm:py-6">
      <SectionHeading title={t("home.collections")} href="/collections" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {collections.map((collection, index) => (
          <Reveal key={collection.id} delay={index * 0.08}>
            <Link
              href={`/collections/${collection.slug}`}
              className="group bg-muted relative block aspect-[4/3] overflow-hidden rounded-xl"
            >
              {collection.coverImageUrl ? (
                <Image
                  src={collection.coverImageUrl}
                  alt={collection.name}
                  fill
                  sizes="(min-width: 640px) 33vw, 100vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : null}
              <ReadableOverlay variant="bottom" />
              <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-2">
                <span className="font-heading text-shadow-premium truncate text-sm font-semibold text-white sm:text-lg">
                  {collection.name}
                </span>
                <span className="hidden shrink-0 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-black opacity-0 shadow-md transition-opacity duration-300 group-hover:opacity-100 sm:inline">
                  {t("home.discover")}
                </span>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
