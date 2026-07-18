import { Badge } from "@/components/ui/badge"

interface PreorderBadgeProps {
  isComingSoon: boolean
  isPreorderable: boolean
}

export function PreorderBadge({
  isComingSoon,
  isPreorderable,
}: PreorderBadgeProps) {
  if (isComingSoon) {
    return <Badge variant="secondary">Bientôt disponible</Badge>
  }
  if (isPreorderable) {
    return (
      <Badge className="bg-accent-gold-muted text-accent-gold-foreground">
        Précommande
      </Badge>
    )
  }
  return null
}
