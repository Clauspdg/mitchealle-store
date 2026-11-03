import { siteConfig } from "@/config/site"
import type { MessageKey, Translator } from "@/i18n/translate"
import type { MenuItem } from "@/types/menu"

/**
 * Admin-entered text is shown as entered. Only the values shipped with the
 * site, which nobody has replaced, are ours to translate.
 */
export function localizeStoreSettings<
  T extends { slogan: string | null; description: string },
>(settings: T, { t }: Pick<Translator, "t">): T {
  return {
    ...settings,
    slogan:
      settings.slogan === siteConfig.tagline
        ? t("shell.store.tagline")
        : settings.slogan,
    description:
      settings.description === siteConfig.description
        ? t("shell.store.description")
        : settings.description,
  }
}

/** The menu entries the site starts with, by their original label. */
const DEFAULT_MENU_LABELS: Record<string, MessageKey> = {
  Accueil: "shell.menu.home",
  Produits: "shell.menu.products",
  Collections: "shell.menu.collections",
  "À propos": "shell.menu.about",
  "Notre histoire": "shell.menu.story",
  Contact: "shell.menu.contact",
  "Nos collections": "shell.menu.ourCollections",
  "Toutes les catégories": "shell.menu.allCategories",
  Politique: "shell.menu.policy",
  Confidentialité: "shell.menu.privacy",
  "Conditions générales": "shell.menu.terms",
  Livraison: "shell.menu.delivery",
  "Livraison & retours": "shell.menu.shippingReturns",
  "Mes commandes": "shell.menu.myOrders",
  FAQ: "shell.menu.faq",
  "Questions fréquentes": "shell.menu.questions",
}

export function localizeMenu(
  items: MenuItem[],
  { t }: Pick<Translator, "t">
): MenuItem[] {
  return items.map((item) => {
    const key = DEFAULT_MENU_LABELS[item.label]
    return key ? { ...item, label: t(key) } : item
  })
}
