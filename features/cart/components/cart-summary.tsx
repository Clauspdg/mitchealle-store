import Link from "next/link"

import { formatPriceMinor } from "@/utils/currency"
import { Button } from "@/components/ui/button"

interface CartSummaryProps {
  subtotalMinor: number
  currency: string
  /** Lines priced in another currency: they block the order. */
  blockedCount: number
}

export function CartSummary({
  subtotalMinor,
  currency,
  blockedCount,
}: CartSummaryProps) {
  return (
    <div className="bg-card ring-foreground/10 flex flex-col gap-4 rounded-xl p-6 ring-1">
      <h2 className="font-heading text-lg font-medium">Résumé</h2>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Sous-total</span>
        <span>{formatPriceMinor(subtotalMinor, currency)}</span>
      </div>
      <p className="text-muted-foreground text-xs">
        Les frais de livraison sont calculés à l&apos;étape suivante.
      </p>
      {blockedCount > 0 ? (
        <p className="text-destructive text-sm" role="alert">
          {blockedCount === 1
            ? `Un article de votre panier n'est pas vendu en ${currency}. Retirez-le pour commander.`
            : `${blockedCount} articles de votre panier ne sont pas vendus en ${currency}. Retirez-les pour commander.`}
        </p>
      ) : (
        <Button
          render={<Link href="/checkout" />}
          nativeButton={false}
          size="lg"
          className="w-full"
        >
          Passer la commande
        </Button>
      )}
    </div>
  )
}
