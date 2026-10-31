import { getSession } from "@/lib/session.server"
import { listProducts } from "@/services/firestore/products"
import { listCategories } from "@/services/firestore/categories"
import { listCollections } from "@/services/firestore/collections"
import { listWishlistItems } from "@/services/firestore/wishlists"
import { listActiveBanners } from "@/services/firestore/banners"
import { listHomepageSections } from "@/services/firestore/homepage"
import { getStoreSettings } from "@/services/firestore/settings"
import { heroSlides } from "@/lib/demo-content"
import type { Category } from "@/types/category"
import type { Collection } from "@/types/collection"
import type { HomepageSectionConfig } from "@/types/homepage-section"
import type { Product } from "@/types/product"

// Live catalog data (stock, published status) must never be baked into the
// build output — always render fresh, per request.
export const dynamic = "force-dynamic"
import { ScrollCarousel } from "@/components/shared/scroll-carousel"
import { ProductGrid } from "@/features/catalog/components/storefront/product-grid"
import { CollectionsShowcase } from "@/components/home/collections-showcase"
import { BrandsStrip } from "@/components/home/brands-strip"
import { NewsletterSection } from "@/components/home/newsletter-section"
import { BecomeSellerCTA } from "@/components/marketplace/become-seller-cta"
import { CategoryRail } from "@/components/marketplace/category-rail"
import { FeaturedStores } from "@/components/marketplace/featured-stores"
import {
  MarketplaceHero,
  type HeroProductVisual,
  type HeroSlideView,
} from "@/components/marketplace/marketplace-hero"
import { MarketplaceProductCard } from "@/components/marketplace/marketplace-product-card"
import { PromotionalSection } from "@/components/marketplace/promotional-section"
import { SectionHeading } from "@/components/marketplace/section-heading"

const NEW_ARRIVALS_COUNT = 10

export default async function Home() {
  const session = await getSession()

  const [
    { items: products },
    categories,
    collections,
    wishlist,
    heroBanners,
    homepageSections,
    storeSettings,
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
    getStoreSettings(),
  ])

  // If no admin-configured hero banner exists yet, fall back to the
  // static marketplace slides, illustrated by the product mosaic.
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
      : heroSlides.map((slide) => ({ ...slide, imageUrl: null }))

  const wishlistProductIds = new Set(wishlist.map((item) => item.id))

  // Split the same already-fetched page into homepage rails — a re-sorted
  // "Populaires" slice (in-memory only, no new Firestore query) and the
  // existing createdAt_desc order for "Nouveautés".
  const popularProducts = [...products]
    .sort(
      (a, b) =>
        b.ratingAverage * b.ratingCount - a.ratingAverage * a.ratingCount
    )
    .slice(0, 12)
  const newArrivals = products.slice(0, NEW_ARRIVALS_COUNT)
  const promoProducts = products
    .filter((product) => product.salePriceMinor !== null)
    .slice(0, 12)

  const heroVisuals: HeroProductVisual[] = popularProducts.flatMap(
    (product) => {
      const image = product.images[0]
      return image
        ? [
            {
              id: product.id,
              imageUrl: image.url,
              alt: image.alt || product.name,
              href: `/products/${product.slug}`,
            },
          ]
        : []
    }
  )

  function renderProductRail(id: string, heading: string, rail: Product[]) {
    if (rail.length === 0) return null
    return (
      <section
        id={id}
        className="mx-auto w-full max-w-7xl scroll-mt-32 px-4 py-4 sm:py-6"
      >
        <SectionHeading title={heading} href="/products?sort=popularity_desc" />
        <ScrollCarousel itemClassName="w-[44vw] sm:w-52 lg:w-56">
          {rail.map((product) => (
            <MarketplaceProductCard
              key={product.id}
              product={product}
              isInWishlist={wishlistProductIds.has(product.id)}
            />
          ))}
        </ScrollCarousel>
      </section>
    )
  }

  function renderNewArrivals(heading: string) {
    return (
      <section
        id="nouveautes"
        className="mx-auto w-full max-w-7xl scroll-mt-32 px-4 py-4 sm:py-6"
      >
        <SectionHeading title={heading} href="/products" />
        <ProductGrid
          products={newArrivals}
          wishlistProductIds={wishlistProductIds}
        />
      </section>
    )
  }

  function renderSection(
    type: (typeof homepageSections)[number]["type"],
    config: HomepageSectionConfig | null,
    categories: Category[],
    collections: Collection[]
  ) {
    switch (type) {
      case "heroBanner":
        return (
          <MarketplaceHero
            heading={`${storeSettings.storeName} — ${storeSettings.slogan ?? storeSettings.description}`}
            slides={heroSlideViews}
            productVisuals={heroVisuals}
          />
        )
      case "featuredCollections": {
        // `config.collectionIds` (admin-picked) takes priority; otherwise
        // fall back to the 6 most recent active collections (pre-existing
        // zero-configuration default).
        const picked = config?.collectionIds
          ? collections.filter((c) => config.collectionIds!.includes(c.id))
          : collections.slice(0, 6)
        return <CollectionsShowcase collections={picked} />
      }
      case "categoriesShowcase":
        return <CategoryRail categories={categories} />
      case "popularProducts":
        return renderProductRail(
          "populaires",
          config?.heading || "Produits populaires",
          popularProducts
        )
      case "newArrivals":
        return newArrivals.length > 0
          ? renderNewArrivals(config?.heading || "Nouveautés")
          : null
      case "promotionBanner":
        return (
          <PromotionalSection
            heading={config?.heading || "Promotions et bonnes affaires"}
            products={promoProducts}
            wishlistProductIds={wishlistProductIds}
          />
        )
      case "brandsStrip":
        return <BrandsStrip />
      case "newsletterSignup":
        return <NewsletterSection />
      default:
        return null
    }
  }

  const activeSections = homepageSections.filter((section) => section.isActive)
  // `FeaturedStores` isn't a managed section: it follows the categories, or
  // the first section if an admin has turned the categories off.
  const storesAnchor =
    activeSections.find((section) => section.type === "categoriesShowcase") ??
    activeSections[0]

  return (
    <div className="flex flex-col">
      {activeSections.map((section) => (
        <div key={section.id}>
          {renderSection(section.type, section.config, categories, collections)}
          {section.id === storesAnchor?.id ? <FeaturedStores /> : null}
        </div>
      ))}
      <BecomeSellerCTA />
    </div>
  )
}
