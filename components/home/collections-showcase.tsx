import Image from "next/image"
import Link from "next/link"

import type { Collection } from "@/types/collection"
import { Reveal } from "@/components/shared/reveal"

interface CollectionsShowcaseProps {
  collections: Collection[]
}

export function CollectionsShowcase({ collections }: CollectionsShowcaseProps) {
  if (collections.length === 0) return null

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-16">
      <Reveal>
        <h2 className="font-heading mb-6 text-2xl font-medium">
          Nos collections
        </h2>
      </Reveal>
      <div className="grid gap-4 sm:grid-cols-3">
        {collections.map((collection, index) => (
          <Reveal key={collection.id} delay={index * 0.08}>
            <Link
              href={`/collections/${collection.slug}`}
              className="group bg-muted relative block aspect-[4/5] overflow-hidden rounded-2xl"
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
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/0" />
              <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-2">
                <span className="font-heading text-lg font-medium text-white">
                  {collection.name}
                </span>
                <span className="shrink-0 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-black opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  Découvrir
                </span>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
