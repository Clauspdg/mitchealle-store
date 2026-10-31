"use server"

import { revalidatePath } from "next/cache"

import { requireSession } from "@/lib/session.server"
import { logActivity } from "@/services/monitoring/log-activity"
import { uploadImage } from "@/services/storage/images"
import {
  hasPendingApplication,
  submitSellerApplication,
  SellerWorkflowError,
} from "@/services/firestore/seller/applications"
import {
  SELLER_APPLICATION_LOGO_FIELD,
  sellerApplicationSchema,
} from "@/schemas/seller-application.schema"
import type { ActionResult } from "@/types/action-result"

/** Any signed-in account may apply. Its platform role is never changed. */
export async function submitSellerApplicationAction(
  formData: FormData
): Promise<ActionResult<{ applicationId: string }>> {
  const session = await requireSession("customer")

  const fields = Object.fromEntries(
    [...formData.entries()].filter(
      ([key]) => key !== SELLER_APPLICATION_LOGO_FIELD
    )
  )
  const parsed = sellerApplicationSchema.safeParse(fields)
  if (!parsed.success) {
    return { success: false, error: "Vérifiez les informations du formulaire." }
  }

  if (await hasPendingApplication(session.uid)) {
    return {
      success: false,
      error: "Vous avez déjà une candidature en cours d'examen.",
    }
  }

  try {
    const logo = formData.get(SELLER_APPLICATION_LOGO_FIELD)
    const logoUrl =
      logo instanceof File && logo.size > 0
        ? (await uploadImage("seller-applications", logo)).url
        : null

    const applicationId = await submitSellerApplication(
      { uid: session.uid, email: session.email },
      parsed.data,
      logoUrl
    )
    await logActivity("admin_action", "Candidature vendeur déposée", {
      applicationId,
      storeName: parsed.data.storeName,
    })
    revalidatePath("/account/seller-application")
    return { success: true, data: { applicationId } }
  } catch (error) {
    if (error instanceof SellerWorkflowError) {
      return { success: false, error: error.message }
    }
    if (
      error instanceof Error &&
      /Type de fichier|trop volumineuse/.test(error.message)
    ) {
      return { success: false, error: error.message }
    }
    await logActivity("error", "Échec de dépôt d'une candidature vendeur", {
      message: error instanceof Error ? error.message : String(error),
    })
    return {
      success: false,
      error: "La candidature n'a pas pu être enregistrée. Réessayez.",
    }
  }
}
