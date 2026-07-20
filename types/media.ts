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
