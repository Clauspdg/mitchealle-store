"use server"

import { revalidatePath } from "next/cache"

import { requireSession } from "@/lib/session.server"
import {
  notificationSettingsFormSchema,
  paymentSettingsFormSchema,
  shippingSettingsFormSchema,
} from "@/schemas/settings.schema"
import {
  updateNotificationSettings,
  updatePaymentSettings,
  updateShippingSettings,
} from "@/services/firestore/settings"
import type { ActionResult } from "@/types/action-result"

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Une erreur est survenue."
}

export async function updateShippingSettingsAction(
  input: unknown
): Promise<ActionResult> {
  await requireSession("admin")
  const parsed = shippingSettingsFormSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides.",
    }
  }
  try {
    await updateShippingSettings(parsed.data)
    revalidatePath("/admin/settings/ecommerce")
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

export async function updatePaymentSettingsAction(
  input: unknown
): Promise<ActionResult> {
  await requireSession("admin")
  const parsed = paymentSettingsFormSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides.",
    }
  }
  try {
    await updatePaymentSettings(parsed.data)
    revalidatePath("/admin/settings/ecommerce")
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

export async function updateNotificationSettingsAction(
  input: unknown
): Promise<ActionResult> {
  await requireSession("admin")
  const parsed = notificationSettingsFormSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides.",
    }
  }
  try {
    await updateNotificationSettings(parsed.data)
    revalidatePath("/admin/settings/ecommerce")
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}
