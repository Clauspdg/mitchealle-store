/**
 * Client-side downscale/re-encode via canvas — used only by the media
 * library's upload path (`features/media/components/media-picker-dialog.tsx`).
 * No new dependency: `<canvas>` + `toBlob` are browser built-ins. Images
 * already smaller than `maxDimension` pass through untouched.
 */
export async function compressImage(
  file: File,
  maxDimension = 1920,
  quality = 0.82
): Promise<{ file: File; width: number; height: number }> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
    return { file, width: 0, height: 0 }
  }

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(
    1,
    maxDimension / Math.max(bitmap.width, bitmap.height)
  )
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  if (scale === 1) {
    bitmap.close()
    return { file, width: bitmap.width, height: bitmap.height }
  }

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx) {
    bitmap.close()
    return { file, width: bitmap.width, height: bitmap.height }
  }

  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(
      resolve,
      file.type === "image/png" ? "image/png" : "image/jpeg",
      quality
    )
  )
  if (!blob) return { file, width, height }

  const compressed = new File([blob], file.name, { type: blob.type })
  return { file: compressed, width, height }
}
