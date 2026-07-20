import "server-only"
import { FieldValue, Timestamp } from "firebase-admin/firestore"

import { adminDb } from "@/firebase/admin"
import {
  HOMEPAGE_SECTION_TYPES,
  type HomepageSection,
  type HomepageSectionDocument,
} from "@/types/homepage-section"

const HOMEPAGE_COLLECTION = "homepage"

function toSection(
  id: string,
  data: FirebaseFirestore.DocumentData
): HomepageSection {
  return { id, ...(data as HomepageSectionDocument) }
}

/** Real `Timestamp` instance — see the identical comment in
 * `services/firestore/settings.ts` for why this matters. */
function nowTimestamp() {
  return Timestamp.now()
}

/**
 * Matches `app/page.tsx`'s pre-Sprint-10A hardcoded order exactly — used
 * in-memory whenever no `homepage` documents exist yet, so a fresh deploy
 * renders byte-for-byte what it rendered before this sprint. Nothing is
 * written to Firestore until an admin actually saves a change.
 */
const DEFAULT_SECTIONS: HomepageSection[] = HOMEPAGE_SECTION_TYPES.map(
  (type, index) => ({
    id: type,
    type,
    position: index,
    isActive: true,
    config: null,
    updatedBy: null,
    updatedAt: nowTimestamp(),
  })
)

async function fetchSections(): Promise<HomepageSection[]> {
  const snapshot = await adminDb
    .collection(HOMEPAGE_COLLECTION)
    .orderBy("position", "asc")
    .get()
  return snapshot.docs.map((doc) => toSection(doc.id, doc.data()))
}

/** Storefront-safe read — never writes, always falls back to defaults. */
export async function listHomepageSections(): Promise<HomepageSection[]> {
  const sections = await fetchSections()
  return sections.length > 0 ? sections : DEFAULT_SECTIONS
}

/**
 * Admin-only: seeds the 8 default sections on first visit to the builder
 * page, so toggling/reordering always has real documents to mutate. A
 * no-op if sections already exist.
 */
export async function getOrSeedHomepageSections(): Promise<HomepageSection[]> {
  const existing = await fetchSections()
  if (existing.length > 0) return existing

  const batch = adminDb.batch()
  for (const section of DEFAULT_SECTIONS) {
    batch.set(adminDb.collection(HOMEPAGE_COLLECTION).doc(section.id), {
      type: section.type,
      position: section.position,
      isActive: section.isActive,
      config: section.config,
      updatedBy: null,
      updatedAt: FieldValue.serverTimestamp(),
    })
  }
  await batch.commit()
  return fetchSections()
}

export async function setHomepageSectionActive(
  id: string,
  isActive: boolean,
  actorUid: string
): Promise<void> {
  await adminDb.collection(HOMEPAGE_COLLECTION).doc(id).update({
    isActive,
    updatedBy: actorUid,
    updatedAt: FieldValue.serverTimestamp(),
  })
}

export async function reorderHomepageSections(
  orderedIds: string[],
  actorUid: string
): Promise<void> {
  const batch = adminDb.batch()
  orderedIds.forEach((id, index) => {
    batch.update(adminDb.collection(HOMEPAGE_COLLECTION).doc(id), {
      position: index,
      updatedBy: actorUid,
      updatedAt: FieldValue.serverTimestamp(),
    })
  })
  await batch.commit()
}
