import "server-only"
import { randomUUID } from "node:crypto"

import { adminStorage } from "@/firebase/admin"
import { UserError } from "@/i18n/user-error"

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
])

const GCS_PUBLIC_HOST = "https://storage.googleapis.com"

/** Same checks for every image the app stores, public or private. */
export function assertAllowedImage(file: File): string {
  if (!ALLOWED_CONTENT_TYPES.has(file.type)) {
    throw new UserError("errors.fileType", { type: file.type || "?" })
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new UserError("errors.imageTooLarge")
  }
  return file.type.split("/")[1] ?? "jpg"
}

/**
 * Public download URL of a stored object. The Storage emulator doesn't serve
 * the GCS public host, so locally the URL goes through its Firebase endpoint,
 * which applies the public-read paths of storage.rules.
 */
export function publicObjectUrl(bucketName: string, path: string): string {
  const emulatorHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST
  if (emulatorHost) {
    return `http://${emulatorHost}/v0/b/${bucketName}/o/${encodeURIComponent(path)}?alt=media`
  }
  return `${GCS_PUBLIC_HOST}/${bucketName}/${path}`
}

/** Inverse of `publicObjectUrl` for this app's bucket; `null` for any other
 * URL, including another bucket or an external host. */
export function storagePathFromPublicUrl(url: string): string | null {
  const bucketName = adminStorage.bucket().name
  let path: string | null = null
  const gcsPrefix = `${GCS_PUBLIC_HOST}/${bucketName}/`
  if (url.startsWith(gcsPrefix)) {
    path = decodeURIComponent(url.slice(gcsPrefix.length).split("?")[0])
  } else {
    const emulatorHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST
    const emulatorPrefix = `http://${emulatorHost}/v0/b/${bucketName}/o/`
    if (emulatorHost && url.startsWith(emulatorPrefix)) {
      path = decodeURIComponent(url.slice(emulatorPrefix.length).split("?")[0])
    }
  }
  if (!path || path.split("/").some((part) => part === ".." || !part)) {
    return null
  }
  return path
}

export async function saveImage(
  path: string,
  file: File,
  visibility: "public" | "private"
): Promise<void> {
  const buffer = Buffer.from(await file.arrayBuffer())
  await adminStorage
    .bucket()
    .file(path)
    .save(buffer, {
      contentType: file.type,
      public: visibility === "public",
      metadata:
        visibility === "public"
          ? { cacheControl: "public, max-age=31536000, immutable" }
          : { cacheControl: "private, no-store" },
    })
}

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
  const extension = assertAllowedImage(file)
  const path = `catalog/${folder}/${randomUUID()}.${extension}`
  await saveImage(path, file, "public")
  return { url: publicObjectUrl(adminStorage.bucket().name, path), path }
}

export async function deleteImage(path: string): Promise<void> {
  await adminStorage.bucket().file(path).delete({ ignoreNotFound: true })
}
