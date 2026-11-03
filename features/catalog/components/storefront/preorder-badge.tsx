"use client"

import { Badge } from "@/components/ui/badge"
import { useI18n } from "@/i18n/client"

interface PreorderBadgeProps {
  isComingSoon: boolean
  isPreorderable: boolean
}

export function PreorderBadge({
  isComingSoon,
  isPreorderable,
}: PreorderBadgeProps) {
  const { t } = useI18n()
  if (isComingSoon) {
    return (
      <Badge variant="secondary" className="shadow-sm">
        {t("catalog.comingSoon")}
      </Badge>
    )
  }
  if (isPreorderable) {
    return (
      <Badge className="bg-accent-gold-muted text-accent-gold-foreground shadow-sm">
        {t("catalog.preorder")}
      </Badge>
    )
  }
  return null
}
