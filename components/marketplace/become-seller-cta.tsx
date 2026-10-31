import Link from "next/link"
import { EyeIcon, PackageIcon, StoreIcon, type LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

const BENEFITS: Array<{ icon: LucideIcon; title: string; text: string }> = [
  {
    icon: StoreIcon,
    title: "Votre vitrine en ligne",
    text: "Présentez votre boutique et vos produits.",
  },
  {
    icon: EyeIcon,
    title: "Plus de visibilité",
    text: "Touchez des clients au-delà de votre quartier.",
  },
  {
    icon: PackageIcon,
    title: "Vendez simplement",
    text: "Concentrez-vous sur vos produits et vos clients.",
  },
]

export function BecomeSellerCTA() {
  return (
    <section
      id="devenir-vendeur"
      className="bg-brand-blue mt-4 scroll-mt-32 text-white sm:mt-6"
    >
      <div className="mx-auto grid w-full max-w-7xl items-center gap-6 px-4 py-8 md:grid-cols-2 md:gap-10 md:py-12">
        <div className="flex flex-col items-start gap-3">
          <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
            Devenez vendeur sur C.L.A.G
          </h2>
          <p className="max-w-md text-sm text-white/90 sm:text-base">
            Vous êtes petit commerçant, vendeur indépendant ou boutique locale ?
            L&apos;ouverture aux vendeurs arrive bientôt : parlons de votre
            projet dès maintenant.
          </p>
          <Button
            render={<Link href="/contact" />}
            nativeButton={false}
            className="bg-accent-gold text-accent-gold-foreground hover:bg-accent-gold/90 mt-1 h-11 px-5 font-semibold"
          >
            Nous contacter
          </Button>
        </div>
        <ul className="flex flex-col gap-3">
          {BENEFITS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/15">
                <Icon className="size-4" />
              </span>
              <span className="flex flex-col">
                <span className="text-sm font-semibold">{title}</span>
                <span className="text-sm text-white/90">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
