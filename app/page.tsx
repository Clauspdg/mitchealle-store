import Link from "next/link"

import { siteConfig } from "@/config/site"
import { listProducts } from "@/services/firestore/products"
import { listCollections } from "@/services/firestore/collections"

// Live catalog data (stock, published status) must never be baked into the
// build output — always render fresh, per request.
export const dynamic = "force-dynamic"
import { Button } from "@/components/ui/button"
import { Reveal } from "@/components/shared/reveal"
import { ProductGrid } from "@/features/catalog/components/storefront/product-grid"

export default async function Home() {
  const [{ items: products }, collections] = await Promise.all([
    listProducts({
      q: "",
      status: "published",
      categoryId: "",
      collectionId: "",
      sort: "createdAt_desc",
      cursor: null,
    }),
    listCollections({ activeOnly: true }),
  ])

  const featuredProducts = products.slice(0, 8)
  const featuredCollections = collections.slice(0, 3)

  return (
    <div className="flex flex-col">
      <section className="bg-surface-ink text-surface-ink-foreground relative overflow-hidden">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-24 text-center sm:py-32">
          <Reveal>
            <p className="text-accent-gold text-xs font-medium tracking-[0.2em] uppercase">
              Élégance intemporelle
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <h1 className="shimmer shimmer-once shimmer-color-accent-gold font-heading max-w-2xl text-4xl leading-tight font-medium sm:text-6xl">
              {siteConfig.name}
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="max-w-md text-sm text-white/70 sm:text-base">
              {siteConfig.description}
            </p>
          </Reveal>
          <Reveal delay={0.3}>
            <Button
              render={<Link href="/products" />}
              nativeButton={false}
              size="lg"
              className="bg-accent-gold text-accent-gold-foreground hover:bg-accent-gold/90 mt-2"
            >
              Découvrir la collection
            </Button>
          </Reveal>
        </div>
      </section>

      {featuredCollections.length > 0 ? (
        <section className="mx-auto w-full max-w-6xl px-6 py-16">
          <Reveal>
            <h2 className="font-heading mb-6 text-2xl font-medium">
              Nos collections
            </h2>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-3">
            {featuredCollections.map((collection, index) => (
              <Reveal key={collection.id} delay={index * 0.08}>
                <Link
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
              </Reveal>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <Reveal>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-heading text-2xl font-medium">Nouveautés</h2>
            <Link
              href="/products"
              className="text-muted-foreground hover:text-foreground text-sm underline underline-offset-4"
            >
              Voir tout
            </Link>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <ProductGrid products={featuredProducts} />
        </Reveal>
      </section>
    </div>
  )
}
