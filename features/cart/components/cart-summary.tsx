import Link from "next/link"

import { formatPriceMinor } from "@/utils/currency"
import { Button } from "@/components/ui/button"

interface CartSummaryProps {
  subtotalMinor: number
  currency: string
}

export function CartSummary({ subtotalMinor, currency }: CartSummaryProps) {
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
      <Button
        render={<Link href="/checkout" />}
        nativeButton={false}
        size="lg"
        className="w-full"
      >
        Passer la commande
      </Button>
    </div>
  )
}
