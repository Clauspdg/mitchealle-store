import { getSession } from "@/lib/session.server"
import { hasPermission } from "@/lib/permissions"
import { getSellerApplication } from "@/services/firestore/seller/applications"
import { readPrivateFile } from "@/services/storage/seller-files"

/**
 * An application's logo stays private until approval: only an account with
 * the `sellers` permission reads it, through this route. Anyone else gets the
 * same 404 as for a missing file.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const notFound = new Response("Introuvable.", { status: 404 })
  const session = await getSession()
  if (!session || !hasPermission(session.role, "sellers")) return notFound

  const { id } = await params
  const application = await getSellerApplication(id)
  if (!application?.logoPath) return notFound

  const file = await readPrivateFile(application.logoPath)
  if (!file) return notFound

  return new Response(new Uint8Array(file.data), {
    headers: {
      "content-type": file.contentType,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  })
}
