import Link from "next/link"

import { Button } from "@/components/ui/button"
import { getI18n } from "@/i18n/server"

interface CartSummaryProps {
  subtotalMinor: number
  currency: string
  /** Lines priced in another currency: they block the order. */
  blockedCount: number
}

export async function CartSummary({
  subtotalMinor,
  currency,
  blockedCount,
}: CartSummaryProps) {
  const { t, plural, price } = await getI18n()
  return (
    <div className="bg-card ring-foreground/10 flex flex-col gap-4 rounded-xl p-6 ring-1">
      <h2 className="font-heading text-lg font-medium">{t("cart.summary")}</h2>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{t("cart.subtotal")}</span>
        <span>{price(subtotalMinor, currency)}</span>
      </div>
      <p className="text-muted-foreground text-xs">{t("cart.shippingNext")}</p>
      {blockedCount > 0 ? (
        <p className="text-destructive text-sm" role="alert">
          {plural("cart.blocked", blockedCount, { currency })}
        </p>
      ) : (
        <Button
          render={<Link href="/checkout" />}
          nativeButton={false}
          size="lg"
          className="w-full"
        >
          {t("cart.checkout")}
        </Button>
      )}
    </div>
  )
}
