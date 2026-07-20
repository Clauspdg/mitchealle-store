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
import type {
  NotificationSettings,
  PaymentSettings,
  ShippingSettings,
} from "@/types/settings"

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Une erreur est survenue."
}

export async function updateShippingSettingsAction(
  input: unknown
): Promise<ActionResult<ShippingSettings>> {
  await requireSession("admin")
  const parsed = shippingSettingsFormSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides.",
    }
  }
  try {
    const settings = await updateShippingSettings(parsed.data)
    revalidatePath("/admin/settings/ecommerce")
    return { success: true, data: settings }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

export async function updatePaymentSettingsAction(
  input: unknown
): Promise<ActionResult<PaymentSettings>> {
  await requireSession("admin")
  const parsed = paymentSettingsFormSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides.",
    }
  }
  try {
    const settings = await updatePaymentSettings(parsed.data)
    revalidatePath("/admin/settings/ecommerce")
    return { success: true, data: settings }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

export async function updateNotificationSettingsAction(
  input: unknown
): Promise<ActionResult<NotificationSettings>> {
  await requireSession("admin")
  const parsed = notificationSettingsFormSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides.",
    }
  }
  try {
    const settings = await updateNotificationSettings(parsed.data)
    revalidatePath("/admin/settings/ecommerce")
    return { success: true, data: settings }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}
