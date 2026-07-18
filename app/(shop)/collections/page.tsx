import Link from "next/link"
import type { Metadata } from "next"

import { listCollections } from "@/services/firestore/collections"

export const metadata: Metadata = { title: "Collections" }
// Live catalog data must never be baked into the build output.
export const dynamic = "force-dynamic"

export default async function CollectionsPage() {
  const collections = await listCollections({ activeOnly: true })

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-12">
      <h1 className="font-heading text-3xl font-medium">Collections</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {collections.map((collection) => (
          <Link
            key={collection.id}
            href={`/collections/${collection.slug}`}
            className="group bg-muted relative block aspect-[4/5] overflow-hidden rounded-xl"
          >
            {collection.coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- external Storage URL
              <img
                src={collection.coverImageUrl}
                alt={collection.name}
                className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0" />
            <span className="font-heading absolute bottom-4 left-4 text-lg font-medium text-white">
              {collection.name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
