import "server-only"
import { FieldValue } from "firebase-admin/firestore"

import { adminDb } from "@/firebase/admin"
import { deleteImage, uploadImage } from "@/services/storage/images"
import { decodeCursor, encodeCursor } from "@/utils/pagination"
import { isMissingIndexError } from "@/utils/firestore-errors"
import type { CursorPage } from "@/types/pagination"
import type { MediaDocument, MediaItem } from "@/types/media"

const MEDIA_COLLECTION = "mediaLibrary"
const PAGE_SIZE = 30

function toMediaItem(
  id: string,
  data: FirebaseFirestore.DocumentData
): MediaItem {
  return { id, ...(data as MediaDocument) }
}

interface CursorPayload {
  sortValue: unknown
  id: string
}

/**
 * Wraps the existing, untouched `uploadImage()` — every current caller
 * (product/category/collection/return uploads) keeps its exact behavior;
 * this is a new, separate write path that additionally tracks the upload
 * as a browsable `mediaLibrary` record.
 */
export async function uploadToLibrary(
  folder: string,
  file: File,
  uploadedBy: string,
  altText = "",
  dimensions: { width: number; height: number } | null = null
): Promise<MediaItem> {
  const { url, path } = await uploadImage(folder, file)

  const docData: MediaDocument = {
    url,
    path,
    folder,
    altText,
    width: dimensions?.width ?? null,
    height: dimensions?.height ?? null,
    uploadedBy,
    createdAt:
      FieldValue.serverTimestamp() as unknown as MediaDocument["createdAt"],
  }

  const ref = await adminDb.collection(MEDIA_COLLECTION).add(docData)
  const created = await ref.get()
  return toMediaItem(created.id, created.data()!)
}

export async function listMedia(params: {
  folder?: string
  cursor: string | null
}): Promise<CursorPage<MediaItem>> {
  let query: FirebaseFirestore.Query = adminDb.collection(MEDIA_COLLECTION)
  if (params.folder) {
    query = query.where("folder", "==", params.folder)
  }
  query = query
    .orderBy("createdAt", "desc")
    .orderBy("__name__", "desc")
    .limit(PAGE_SIZE + 1)

  if (params.cursor) {
    const decoded = decodeCursor<CursorPayload>(params.cursor)
    query = query.startAfter(decoded.sortValue, decoded.id)
  }

  let snapshot
  try {
    snapshot = await query.get()
  } catch (error) {
    if (isMissingIndexError(error)) {
      console.error(
        "[listMedia] Firestore composite index missing — returning an empty page instead of crashing. Deploy indexes: firebase deploy --only firestore:indexes",
        error
      )
      return { items: [], nextCursor: null, hasMore: false }
    }
    throw error
  }
  const docs = snapshot.docs.slice(0, PAGE_SIZE)
  const hasMore = snapshot.docs.length > PAGE_SIZE
  const items = docs.map((doc) => toMediaItem(doc.id, doc.data()))

  const lastDoc = docs.at(-1)
  const nextCursor =
    hasMore && lastDoc
      ? encodeCursor({
          sortValue: lastDoc.get("createdAt"),
          id: lastDoc.id,
        } satisfies CursorPayload)
      : null

  return { items, nextCursor, hasMore }
}

export async function deleteMediaItem(id: string): Promise<void> {
  const doc = await adminDb.collection(MEDIA_COLLECTION).doc(id).get()
  if (!doc.exists) return
  const data = doc.data() as MediaDocument
  await deleteImage(data.path)
  await doc.ref.delete()
}
