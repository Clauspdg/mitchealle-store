import "server-only"
import { FieldValue, Timestamp } from "firebase-admin/firestore"

import { adminDb } from "@/firebase/admin"
import { isMissingIndexError } from "@/utils/firestore-errors"
import type { BannerFormInput } from "@/schemas/banner.schema"
import type { Banner, BannerDocument, BannerPlacement } from "@/types/banner"

const BANNERS_COLLECTION = "banners"

function toBanner(id: string, data: FirebaseFirestore.DocumentData): Banner {
  return { id, ...(data as BannerDocument) }
}

function toTimestampOrNull(date: Date | null): Timestamp | null {
  return date ? Timestamp.fromDate(date) : null
}

export async function listBanners(
  placement?: BannerPlacement
): Promise<Banner[]> {
  let query: FirebaseFirestore.Query = adminDb
    .collection(BANNERS_COLLECTION)
    .orderBy("position", "asc")

  if (placement) {
    query = query.where("placement", "==", placement)
  }

  try {
    const snapshot = await query.get()
    return snapshot.docs.map((doc) => toBanner(doc.id, doc.data()))
  } catch (error) {
    if (isMissingIndexError(error)) {
      console.error(
        "[listBanners] Firestore composite index missing — returning an empty list instead of crashing. Deploy indexes: firebase deploy --only firestore:indexes",
        error
      )
      return []
    }
    throw error
  }
}

/**
 * Storefront-safe read: active banners for a placement, within their
 * optional display window. Empty array means "nothing configured yet" —
 * callers (e.g. `app/page.tsx`) fall back to static defaults.
 */
export async function listActiveBanners(
  placement: BannerPlacement
): Promise<Banner[]> {
  const banners = await listBanners(placement)
  const now = Date.now()
  return banners.filter((banner) => {
    if (!banner.isActive) return false
    if (banner.startAt && banner.startAt.toMillis() > now) return false
    if (banner.endAt && banner.endAt.toMillis() < now) return false
    return true
  })
}

export async function getBanner(id: string): Promise<Banner | null> {
  const doc = await adminDb.collection(BANNERS_COLLECTION).doc(id).get()
  return doc.exists ? toBanner(doc.id, doc.data()!) : null
}

export async function createBanner(
  input: BannerFormInput,
  actorUid: string
): Promise<Banner> {
  const now = FieldValue.serverTimestamp()
  const docData = {
    title: input.title,
    imageUrl: input.imageUrl,
    linkUrl: input.linkUrl,
    placement: input.placement,
    startAt: toTimestampOrNull(input.startAt),
    endAt: toTimestampOrNull(input.endAt),
    isActive: input.isActive,
    position: input.position,
    eyebrow: input.eyebrow,
    subtitle: input.subtitle,
    primaryButtonLabel: input.primaryButtonLabel,
    primaryButtonHref: input.primaryButtonHref,
    secondaryButtonLabel: input.secondaryButtonLabel,
    secondaryButtonHref: input.secondaryButtonHref,
    createdBy: actorUid,
    createdAt: now,
    updatedAt: now,
  }

  const ref = await adminDb.collection(BANNERS_COLLECTION).add(docData)
  const created = await ref.get()
  return toBanner(created.id, created.data()!)
}

export async function updateBanner(
  id: string,
  input: BannerFormInput
): Promise<Banner> {
  await adminDb
    .collection(BANNERS_COLLECTION)
    .doc(id)
    .update({
      title: input.title,
      imageUrl: input.imageUrl,
      linkUrl: input.linkUrl,
      placement: input.placement,
      startAt: toTimestampOrNull(input.startAt),
      endAt: toTimestampOrNull(input.endAt),
      isActive: input.isActive,
      position: input.position,
      eyebrow: input.eyebrow,
      subtitle: input.subtitle,
      primaryButtonLabel: input.primaryButtonLabel,
      primaryButtonHref: input.primaryButtonHref,
      secondaryButtonLabel: input.secondaryButtonLabel,
      secondaryButtonHref: input.secondaryButtonHref,
      updatedAt: FieldValue.serverTimestamp(),
    })

  return (await getBanner(id))!
}

export async function setBannerActive(
  id: string,
  isActive: boolean
): Promise<void> {
  await adminDb.collection(BANNERS_COLLECTION).doc(id).update({
    isActive,
    updatedAt: FieldValue.serverTimestamp(),
  })
}

export async function deleteBanner(id: string): Promise<void> {
  await adminDb.collection(BANNERS_COLLECTION).doc(id).delete()
}

export async function reorderBanners(orderedIds: string[]): Promise<void> {
  const batch = adminDb.batch()
  orderedIds.forEach((id, index) => {
    batch.update(adminDb.collection(BANNERS_COLLECTION).doc(id), {
      position: index,
      updatedAt: FieldValue.serverTimestamp(),
    })
  })
  await batch.commit()
}
