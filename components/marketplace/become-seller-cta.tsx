import Link from "next/link"
import { EyeIcon, PackageIcon, StoreIcon, type LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { getI18n } from "@/i18n/server"
import type { MessageKey } from "@/i18n/translate"

const BENEFITS: Array<{
  icon: LucideIcon
  title: MessageKey
  text: MessageKey
}> = [
  {
    icon: StoreIcon,
    title: "home.becomeSeller.showcaseTitle",
    text: "home.becomeSeller.showcaseText",
  },
  {
    icon: EyeIcon,
    title: "home.becomeSeller.visibilityTitle",
    text: "home.becomeSeller.visibilityText",
  },
  {
    icon: PackageIcon,
    title: "home.becomeSeller.simpleTitle",
    text: "home.becomeSeller.simpleText",
  },
]

export async function BecomeSellerCTA() {
  const { t } = await getI18n()
  return (
    <section
      id="devenir-vendeur"
      className="bg-brand-blue mt-4 scroll-mt-32 text-white sm:mt-6"
    >
      <div className="mx-auto grid w-full max-w-7xl items-center gap-6 px-4 py-8 md:grid-cols-2 md:gap-10 md:py-12">
        <div className="flex flex-col items-start gap-3">
          <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
            {t("home.becomeSeller.title")}
          </h2>
          <p className="max-w-md text-sm text-white/90 sm:text-base">
            {t("home.becomeSeller.text")}
          </p>
          <Button
            render={<Link href="/account/seller-application" />}
            nativeButton={false}
            className="bg-accent-gold text-accent-gold-foreground hover:bg-accent-gold/90 mt-1 h-11 px-5 font-semibold"
          >
            {t("home.becomeSeller.apply")}
          </Button>
        </div>
        <ul className="flex flex-col gap-3">
          {BENEFITS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/15">
                <Icon className="size-4" />
              </span>
              <span className="flex flex-col">
                <span className="text-sm font-semibold">{t(title)}</span>
                <span className="text-sm text-white/90">{t(text)}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
