import "server-only"
import { randomUUID } from "node:crypto"

import { adminStorage } from "@/firebase/admin"

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
])

/**
 * Uploads an image under `catalog/{folder}/{uuid}.{ext}` and makes it
 * publicly readable — product/category/collection imagery is meant to be
 * shown on the public storefront, so this is an intentional exception to
 * the "deny all" default in storage.rules (see docs/technical-recommendations.md).
 */
export async function uploadImage(
  folder: string,
  file: File
): Promise<{ url: string; path: string }> {
  if (!ALLOWED_CONTENT_TYPES.has(file.type)) {
    throw new Error(`Type de fichier non autorisé : ${file.type || "inconnu"}`)
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("Image trop volumineuse (5 Mo maximum).")
  }

  const extension = file.type.split("/")[1] ?? "jpg"
  const path = `catalog/${folder}/${randomUUID()}.${extension}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const bucket = adminStorage.bucket()
  const storageFile = bucket.file(path)

  await storageFile.save(buffer, {
    contentType: file.type,
    public: true,
    metadata: { cacheControl: "public, max-age=31536000, immutable" },
  })

  return { url: `https://storage.googleapis.com/${bucket.name}/${path}`, path }
}

export async function deleteImage(path: string): Promise<void> {
  await adminStorage.bucket().file(path).delete({ ignoreNotFound: true })
}
