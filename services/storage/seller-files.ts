import "server-only"
import { randomUUID } from "node:crypto"

import { adminStorage } from "@/firebase/admin"
import {
  assertAllowedImage,
  publicObjectUrl,
  saveImage,
  storagePathFromPublicUrl,
} from "@/services/storage/images"

/**
 * Storage layout of the marketplace, mirrored by storage.rules:
 * - `sellers/{sellerId}/products/*`: public product images of one store.
 * - `sellers/{sellerId}/logo/*`: public store logo, written at approval.
 * - `seller-applications/{uid}/*`: private application files, never public.
 */
export function sellerProductImagePrefix(sellerId: string): string {
  return `sellers/${sellerId}/products/`
}

export async function uploadSellerProductImage(
  sellerId: string,
  file: File
): Promise<{ url: string; path: string }> {
  const extension = assertAllowedImage(file)
  const path = `${sellerProductImagePrefix(sellerId)}${randomUUID()}.${extension}`
  await saveImage(path, file, "public")
  return { url: publicObjectUrl(adminStorage.bucket().name, path), path }
}

/** True only for an object this store uploaded and that really exists. */
export async function isSellerProductImage(
  sellerId: string,
  url: string
): Promise<boolean> {
  const path = storagePathFromPublicUrl(url)
  if (!path?.startsWith(sellerProductImagePrefix(sellerId))) return false
  // One level only: `sellers/a/products/x/../` was refused above, and a
  // nested folder is never written by `uploadSellerProductImage`.
  if (path.slice(sellerProductImagePrefix(sellerId).length).includes("/")) {
    return false
  }
  const [exists] = await adminStorage.bucket().file(path).exists()
  return exists
}

export async function uploadApplicationLogo(
  uid: string,
  file: File
): Promise<string> {
  const extension = assertAllowedImage(file)
  const path = `seller-applications/${uid}/${randomUUID()}.${extension}`
  await saveImage(path, file, "private")
  return path
}

export async function readPrivateFile(
  path: string
): Promise<{ data: Buffer; contentType: string } | null> {
  const file = adminStorage.bucket().file(path)
  const [exists] = await file.exists()
  if (!exists) return null
  const [[data], [metadata]] = await Promise.all([
    file.download(),
    file.getMetadata(),
  ])
  return {
    data,
    contentType: metadata.contentType ?? "application/octet-stream",
  }
}

/** Copies an approved application's logo to the store's public folder. The
 * private original stays where it is, readable by admins only. */
export async function publishApplicationLogo(
  logoPath: string,
  sellerId: string
): Promise<{ url: string; path: string }> {
  const bucket = adminStorage.bucket()
  const source = bucket.file(logoPath)
  const [[data], [metadata]] = await Promise.all([
    source.download(),
    source.getMetadata(),
  ])
  const extension = logoPath.split(".").pop() ?? "png"
  const path = `sellers/${sellerId}/logo/${randomUUID()}.${extension}`
  await bucket.file(path).save(data, {
    contentType: metadata.contentType,
    public: true,
    metadata: { cacheControl: "public, max-age=31536000, immutable" },
  })
  return { url: publicObjectUrl(bucket.name, path), path }
}
