import type { FirestoreTimestamp } from "./firestore"

/** Exact shape of a `mediaLibrary/{mediaId}` document. Internal admin tool
 * only — no public read (see firestore.rules). */
export interface MediaDocument {
  url: string
  path: string
  folder: string
  altText: string
  width: number | null
  height: number | null
  uploadedBy: string
  createdAt: FirestoreTimestamp
}

export interface MediaItem extends MediaDocument {
  id: string
}

/** `MediaItem` without the Firestore `Timestamp` field — for returning from
 * Server Actions/passing into Client Components, neither of which can
 * receive a class instance like `Timestamp`. */
export type ClientSafeMediaItem = Omit<MediaItem, "createdAt">
