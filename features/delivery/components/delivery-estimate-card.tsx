import { GlobeIcon, TruckIcon } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { formatPriceMinor } from "@/utils/currency"
import {
  DELIVERY_FLAT_FEE_MINOR,
  PICKUP_FEE_MINOR,
} from "@/features/delivery/lib/shipping"

const CURRENCY = "HTG"

export function DeliveryEstimateCard() {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <h3 className="font-heading text-base font-medium">
          Estimation de livraison
        </h3>
        <div className="flex items-start gap-3">
          <TruckIcon className="text-accent-gold mt-0.5 size-5 shrink-0" />
          <div className="flex flex-col">
            <span className="text-sm font-medium">National</span>
            <span className="text-muted-foreground text-xs">
              2-4 jours ouvrés ·{" "}
              {formatPriceMinor(DELIVERY_FLAT_FEE_MINOR, CURRENCY)}
            </span>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <GlobeIcon className="text-accent-gold mt-0.5 size-5 shrink-0" />
          <div className="flex flex-col">
            <span className="text-sm font-medium">International</span>
            <span className="text-muted-foreground text-xs">
              5-10 jours ouvrés
            </span>
          </div>
        </div>
        <p className="text-muted-foreground text-xs">
          Retrait en boutique gratuit (
          {formatPriceMinor(PICKUP_FEE_MINOR, CURRENCY)}) disponible au moment
          du paiement.
        </p>
      </CardContent>
    </Card>
  )
}
