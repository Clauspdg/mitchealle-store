import "server-only"
import { FieldValue, Timestamp } from "firebase-admin/firestore"

import { adminDb } from "@/firebase/admin"
import { mainNav } from "@/config/nav"
import type { Menu, MenuDocument, MenuId, MenuItem } from "@/types/menu"

const MENUS_COLLECTION = "menus"

/** Real `Timestamp` instance — see the identical comment in
 * `services/firestore/settings.ts` for why this matters. */
function nowTimestamp() {
  return Timestamp.now()
}

/** Matches `config/nav.ts`'s `mainNav` exactly. */
const DEFAULT_HEADER_ITEMS: MenuItem[] = mainNav.map((item, index) => ({
  id: `header-${index}`,
  label: item.title,
  href: item.href,
  position: index,
  parentId: null,
}))

/** Matches `components/layout/footer.tsx`'s pre-Sprint-10A `FOOTER_LINK_GROUPS`
 * exactly (groups as non-clickable parents, links as their children). */
const DEFAULT_FOOTER_GROUPS: Array<{
  title: string
  links: Array<{ label: string; href: string }>
}> = [
  {
    title: "À propos",
    links: [
      { label: "Notre histoire", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Nos collections", href: "/collections" },
      { label: "Toutes les catégories", href: "/categories" },
    ],
  },
  {
    title: "Politique",
    links: [
      { label: "Confidentialité", href: "/legal" },
      { label: "Conditions générales", href: "/legal" },
    ],
  },
  {
    title: "Livraison",
    links: [
      { label: "Livraison & retours", href: "/shipping-returns" },
      { label: "Mes commandes", href: "/account/orders" },
    ],
  },
  {
    title: "FAQ",
    links: [{ label: "Questions fréquentes", href: "/faq" }],
  },
]

const DEFAULT_FOOTER_ITEMS: MenuItem[] = DEFAULT_FOOTER_GROUPS.flatMap(
  (group, groupIndex) => {
    const groupId = `footer-group-${groupIndex}`
    return [
      {
        id: groupId,
        label: group.title,
        href: "",
        position: groupIndex,
        parentId: null,
      },
      ...group.links.map((link, linkIndex) => ({
        id: `${groupId}-link-${linkIndex}`,
        label: link.label,
        href: link.href,
        position: linkIndex,
        parentId: groupId,
      })),
    ]
  }
)

const DEFAULT_ITEMS: Record<MenuId, MenuItem[]> = {
  header: DEFAULT_HEADER_ITEMS,
  footer: DEFAULT_FOOTER_ITEMS,
}

/** Falls back to today's hardcoded nav/footer arrays if the doc doesn't
 * exist yet — zero visual change until an admin edits a menu. */
export async function getMenu(id: MenuId): Promise<Menu> {
  const doc = await adminDb.collection(MENUS_COLLECTION).doc(id).get()
  if (!doc.exists) {
    return {
      id,
      items: DEFAULT_ITEMS[id],
      updatedAt: nowTimestamp(),
      updatedBy: null,
    }
  }
  return { id, ...(doc.data() as MenuDocument) }
}

/** Admin-only: seeds the default items on first visit to the menu editor,
 * so add/edit/reorder always has real documents to mutate. No-op if the
 * menu already has items. */
export async function getOrSeedMenu(id: MenuId): Promise<Menu> {
  const existing = await getMenu(id)
  const doc = await adminDb.collection(MENUS_COLLECTION).doc(id).get()
  if (doc.exists) return existing

  await adminDb.collection(MENUS_COLLECTION).doc(id).set({
    items: existing.items,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: null,
  })
  return existing
}

export async function updateMenu(
  id: MenuId,
  items: MenuItem[],
  actorUid: string
): Promise<Menu> {
  await adminDb
    .collection(MENUS_COLLECTION)
    .doc(id)
    .set(
      { items, updatedAt: FieldValue.serverTimestamp(), updatedBy: actorUid },
      { merge: true }
    )
  return getMenu(id)
}
