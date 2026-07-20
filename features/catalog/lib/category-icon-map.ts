import {
  BabyIcon,
  BriefcaseIcon,
  CrownIcon,
  FootprintsIcon,
  GemIcon,
  GiftIcon,
  GlassesIcon,
  HomeIcon,
  LaptopIcon,
  PackageIcon,
  PaletteIcon,
  ScissorsIcon,
  ShapesIcon,
  ShirtIcon,
  ShoppingBagIcon,
  SparklesIcon,
  WatchIcon,
  type LucideIcon,
} from "lucide-react"

/**
 * `Category.icon` is free text an admin types into a form field (see
 * `category-form-dialog.tsx`'s "Icône (nom Lucide)" input) — this is a
 * curated allow-list, not a dynamic import, so an unrecognized or malformed
 * value can never resolve to arbitrary code, only this safe fallback icon.
 */
const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  shirt: ShirtIcon,
  shoe: FootprintsIcon,
  shoes: FootprintsIcon,
  footwear: FootprintsIcon,
  watch: WatchIcon,
  jewelry: GemIcon,
  gem: GemIcon,
  laptop: LaptopIcon,
  electronics: LaptopIcon,
  bag: ShoppingBagIcon,
  accessories: GlassesIcon,
  glasses: GlassesIcon,
  dress: ShirtIcon,
  jacket: ShirtIcon,
  suit: BriefcaseIcon,
  pants: ShirtIcon,
  baby: BabyIcon,
  kids: BabyIcon,
  home: HomeIcon,
  beauty: SparklesIcon,
  crown: CrownIcon,
  luxury: CrownIcon,
  beauty2: ScissorsIcon,
  art: PaletteIcon,
  gift: GiftIcon,
  other: ShapesIcon,
}

export function getCategoryIcon(icon: string | null): LucideIcon {
  if (!icon) return PackageIcon
  return CATEGORY_ICON_MAP[icon.trim().toLowerCase()] ?? PackageIcon
}
