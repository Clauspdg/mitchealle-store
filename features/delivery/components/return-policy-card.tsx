import { PackageCheckIcon, RefreshCwIcon, ShieldCheckIcon } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { getI18n } from "@/i18n/server"
import type { MessageKey } from "@/i18n/translate"

const POLICY_ITEMS: Array<{
  icon: typeof RefreshCwIcon
  title: MessageKey
  description: MessageKey
}> = [
  {
    icon: RefreshCwIcon,
    title: "catalog.returns.windowTitle",
    description: "catalog.returns.windowText",
  },
  {
    icon: PackageCheckIcon,
    title: "catalog.returns.exchangeTitle",
    description: "catalog.returns.exchangeText",
  },
  {
    icon: ShieldCheckIcon,
    title: "catalog.returns.packagingTitle",
    description: "catalog.returns.packagingText",
  },
]

export async function ReturnPolicyCard() {
  const { t } = await getI18n()
  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <h3 className="font-heading text-base font-medium">
          {t("catalog.returns.title")}
        </h3>
        {POLICY_ITEMS.map((item) => (
          <div key={item.title} className="flex items-start gap-3">
            <item.icon className="text-accent-gold mt-0.5 size-5 shrink-0" />
            <div className="flex flex-col">
              <span className="text-sm font-medium">{t(item.title)}</span>
              <span className="text-muted-foreground text-xs">
                {t(item.description)}
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
