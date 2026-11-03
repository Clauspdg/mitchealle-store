import { InfoIcon } from "lucide-react"

import { demoStores } from "@/lib/demo-content"
import { SectionHeading } from "@/components/marketplace/section-heading"
import { SellerCard } from "@/components/marketplace/seller-card"
import { getI18n } from "@/i18n/server"

export async function FeaturedStores() {
  const { t } = await getI18n()
  return (
    <section
      id="boutiques"
      className="mx-auto w-full max-w-7xl scroll-mt-32 px-4 py-4 sm:py-6"
    >
      <SectionHeading title={t("home.featuredStores")} />
      <p className="text-muted-foreground mb-3 flex items-start gap-1.5 text-xs sm:text-sm">
        <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
        {t("home.demoStoresNote")}
      </p>
      <div className="-mx-4 flex snap-x [scrollbar-width:none] gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden">
        {demoStores.map((store) => (
          <div key={store.id} className="w-56 shrink-0 snap-start sm:w-auto">
            <SellerCard
              seller={{
                ...store,
                name: t(store.name),
                specialty: t(store.specialty),
                description: t(store.description),
              }}
              demoLabel={t("home.demo")}
            />
          </div>
        ))}
      </div>
    </section>
  )
}
