import { GlobeIcon, TruckIcon } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import {
  DELIVERY_FLAT_FEE_MINOR,
  PICKUP_FEE_MINOR,
} from "@/features/delivery/lib/shipping"
import { getI18n } from "@/i18n/server"

export async function DeliveryEstimateCard({ currency }: { currency: string }) {
  const { t, price } = await getI18n()
  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <h3 className="font-heading text-base font-medium">
          {t("catalog.delivery.title")}
        </h3>
        <div className="flex items-start gap-3">
          <TruckIcon className="text-accent-gold mt-0.5 size-5 shrink-0" />
          <div className="flex flex-col">
            <span className="text-sm font-medium">
              {t("catalog.delivery.national")}
            </span>
            <span className="text-muted-foreground text-xs">
              {t("catalog.delivery.nationalDelay", {
                fee: price(DELIVERY_FLAT_FEE_MINOR, currency),
              })}
            </span>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <GlobeIcon className="text-accent-gold mt-0.5 size-5 shrink-0" />
          <div className="flex flex-col">
            <span className="text-sm font-medium">
              {t("catalog.delivery.international")}
            </span>
            <span className="text-muted-foreground text-xs">
              {t("catalog.delivery.internationalDelay")}
            </span>
          </div>
        </div>
        <p className="text-muted-foreground text-xs">
          {t("catalog.delivery.pickup", {
            fee: price(PICKUP_FEE_MINOR, currency),
          })}
        </p>
      </CardContent>
    </Card>
  )
}
