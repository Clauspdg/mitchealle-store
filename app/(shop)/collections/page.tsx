import Image from "next/image"
import Link from "next/link"
import type { Metadata } from "next"

import { listCollections } from "@/services/firestore/collections"
import { Reveal } from "@/components/shared/reveal"

export const metadata: Metadata = { title: "Collections" }
// Live catalog data must never be baked into the build output.
export const dynamic = "force-dynamic"

export default async function CollectionsPage() {
  const collections = await listCollections({ activeOnly: true })

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-12">
      <h1 className="font-heading text-3xl font-medium">Collections</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {collections.map((collection, index) => (
          <Reveal key={collection.id} delay={index * 0.06}>
            <Link
              href={`/collections/${collection.slug}`}
              className="group bg-muted relative block aspect-[4/5] overflow-hidden rounded-2xl shadow-sm transition-shadow hover:shadow-xl"
            >
              {collection.coverImageUrl ? (
                <Image
                  src={collection.coverImageUrl}
                  alt={collection.name}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0" />
              <span className="font-heading absolute bottom-4 left-4 text-lg font-medium text-white">
                {collection.name}
              </span>
            </Link>
          </Reveal>
        ))}
      </div>
    </div>
  )
}
