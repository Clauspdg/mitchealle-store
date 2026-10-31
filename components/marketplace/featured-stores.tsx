import { InfoIcon } from "lucide-react"

import { demoStores } from "@/lib/demo-content"
import { SectionHeading } from "@/components/marketplace/section-heading"
import { SellerCard } from "@/components/marketplace/seller-card"

export function FeaturedStores() {
  return (
    <section
      id="boutiques"
      className="mx-auto w-full max-w-7xl scroll-mt-32 px-4 py-4 sm:py-6"
    >
      <SectionHeading title="Boutiques en vedette" />
      <p className="text-muted-foreground mb-3 flex items-start gap-1.5 text-xs sm:text-sm">
        <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
        Exemples de présentation : ces boutiques de démonstration ne sont pas
        des vendeurs inscrits.
      </p>
      <div className="-mx-4 flex snap-x [scrollbar-width:none] gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden">
        {demoStores.map((store) => (
          <div key={store.id} className="w-56 shrink-0 snap-start sm:w-auto">
            <SellerCard seller={store} isDemo />
          </div>
        ))}
      </div>
    </section>
  )
}
