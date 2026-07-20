import Link from "next/link"

import { getSession } from "@/lib/session.server"
import {
  countPublishedProductsByCategory,
  listProducts,
} from "@/services/firestore/products"
import { listCategories } from "@/services/firestore/categories"
import { listCollections } from "@/services/firestore/collections"
import { listWishlistItems } from "@/services/firestore/wishlists"
import { listActiveBanners } from "@/services/firestore/banners"
import { listHomepageSections } from "@/services/firestore/homepage"
import { heroSlides } from "@/lib/demo-content"
import type { HeroSlideView } from "@/components/home/hero-section"
import type { Category } from "@/types/category"
import type { Collection } from "@/types/collection"
import type { Product } from "@/types/product"

// Live catalog data (stock, published status) must never be baked into the
// build output — always render fresh, per request.
export const dynamic = "force-dynamic"
import { Reveal } from "@/components/shared/reveal"
import { ScrollCarousel } from "@/components/shared/scroll-carousel"
import { ProductCard } from "@/features/catalog/components/storefront/product-card"
import { ProductGrid } from "@/features/catalog/components/storefront/product-grid"
import { HeroSection } from "@/components/home/hero-section"
import { PromoBanner } from "@/components/home/promo-banner"
import { CollectionsShowcase } from "@/components/home/collections-showcase"
import { CategoriesIllustrated } from "@/components/home/categories-illustrated"
import { BrandsStrip } from "@/components/home/brands-strip"
import { TestimonialsSection } from "@/components/home/testimonials-section"
import { NewsletterSection } from "@/components/home/newsletter-section"

export default async function Home() {
  const session = await getSession()

  const [
    { items: products },
    categories,
    collections,
    wishlist,
    heroBanners,
    homepageSections,
  ] = await Promise.all([
    listProducts({
      q: "",
      status: "published",
      categoryId: "",
      collectionId: "",
      sort: "createdAt_desc",
      cursor: null,
    }),
    listCategories({ activeOnly: true }),
    listCollections({ activeOnly: true }),
    session ? listWishlistItems(session.uid) : Promise.resolve([]),
    listActiveBanners("homepageHero"),
    listHomepageSections(),
  ])

  // If no admin-configured hero banner exists yet, fall back to the
  // static demo slides — zero-configuration, byte-identical to pre-Sprint-10A.
  const heroSlideViews: HeroSlideView[] =
    heroBanners.length > 0
      ? heroBanners.map((banner) => ({
          id: banner.id,
          imageUrl: banner.imageUrl,
          eyebrow: banner.eyebrow ?? "",
          title: banner.title,
          subtitle: banner.subtitle ?? "",
          primaryButtonLabel: banner.primaryButtonLabel ?? "Acheter maintenant",
          primaryButtonHref: banner.primaryButtonHref ?? "/products",
          secondaryButtonLabel: banner.secondaryButtonLabel,
          secondaryButtonHref: banner.secondaryButtonHref,
        }))
      : heroSlides.map((slide) => ({
          id: slide.imageSeed,
          imageUrl: `https://picsum.photos/seed/${slide.imageSeed}/1920/1200`,
          eyebrow: slide.eyebrow,
          title: slide.title,
          subtitle: slide.subtitle,
          primaryButtonLabel: "Acheter maintenant",
          primaryButtonHref: "/products",
          secondaryButtonLabel: "Découvrir",
          secondaryButtonHref: "/collections",
        }))

  const wishlistProductIds = new Set(wishlist.map((item) => item.id))
  const categoryProductCounts = await countPublishedProductsByCategory(
    categories.map((category) => category.id)
  )

  // Split the same already-fetched page into two homepage rails — a
  // re-sorted "Populaires" slice (in-memory only, no new Firestore query)
  // and the existing createdAt_desc order for "Nouveautés".
  const popularProducts = [...products]
    .sort(
      (a, b) =>
        b.ratingAverage * b.ratingCount - a.ratingAverage * a.ratingCount
    )
    .slice(0, 8)
  const newArrivals = products.slice(0, 8)
  const promoProducts = products
    .filter((product) => product.salePriceMinor !== null)
    .slice(0, 8)

  const featuredCollections = collections.slice(0, 6)

  function renderCarouselRail(
    heading: string,
    rail: Product[],
    showViewAll: boolean
  ) {
    if (rail.length === 0) return null
    return (
      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <Reveal>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-heading text-2xl font-medium">{heading}</h2>
            {showViewAll ? (
              <Link
                href="/products"
                className="text-muted-foreground hover:text-foreground text-sm underline underline-offset-4"
              >
                Voir tout
              </Link>
            ) : null}
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <ScrollCarousel>
            {rail.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isInWishlist={wishlistProductIds.has(product.id)}
              />
            ))}
          </ScrollCarousel>
        </Reveal>
      </section>
    )
  }

  function renderNewArrivals() {
    return (
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
          <ProductGrid
            products={newArrivals}
            wishlistProductIds={wishlistProductIds}
          />
        </Reveal>
      </section>
    )
  }

  function renderSection(
    type: (typeof homepageSections)[number]["type"],
    categories: Category[],
    featuredCollections: Collection[]
  ) {
    switch (type) {
      case "heroBanner":
        // `PromoBanner` (generic marketing banner) isn't a managed section
        // in this sprint's scope — kept immediately after Hero, matching
        // its pre-Sprint-10A adjacency.
        return (
          <>
            <HeroSection slides={heroSlideViews} />
            <PromoBanner />
          </>
        )
      case "featuredCollections":
        return <CollectionsShowcase collections={featuredCollections} />
      case "categoriesShowcase":
        return (
          <CategoriesIllustrated
            categories={categories}
            productCounts={categoryProductCounts}
          />
        )
      case "popularProducts":
        return renderCarouselRail("Produits populaires", popularProducts, false)
      case "newArrivals":
        return newArrivals.length > 0 ? renderNewArrivals() : null
      case "promotionBanner":
        return renderCarouselRail("Promotions", promoProducts, true)
      case "brandsStrip":
        return <BrandsStrip />
      case "newsletterSignup":
        // `TestimonialsSection` isn't a managed section either — kept
        // immediately before Newsletter, matching its original adjacency
        // regardless of where Newsletter itself is repositioned.
        return (
          <>
            <TestimonialsSection />
            <NewsletterSection />
          </>
        )
      default:
        return null
    }
  }

  return (
    <div className="flex flex-col">
      {homepageSections
        .filter((section) => section.isActive)
        .map((section) => (
          <div key={section.id}>
            {renderSection(section.type, categories, featuredCollections)}
          </div>
        ))}
    </div>
  )
}
