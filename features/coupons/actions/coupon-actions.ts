"use server"

import { revalidatePath } from "next/cache"

import { requireSession } from "@/lib/session.server"
import { couponFormSchema } from "@/schemas/coupon.schema"
import {
  couponCodeExists,
  createCoupon,
  setCouponActive,
  updateCoupon,
} from "@/services/firestore/coupons"
import { dispatchNotification } from "@/services/notifications/dispatch"
import { logActivity } from "@/services/monitoring/log-activity"
import type { ActionResult } from "@/types/action-result"
import type { Coupon } from "@/types/coupon"

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Une erreur est survenue."
}

export async function createCouponAction(
  input: unknown
): Promise<ActionResult<Coupon>> {
  const session = await requireSession("staff")
  const parsed = couponFormSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides.",
    }
  }

  if (await couponCodeExists(parsed.data.code)) {
    return { success: false, error: "Ce code existe déjà." }
  }

  try {
    const coupon = await createCoupon(parsed.data, session.uid)
    revalidatePath("/admin/coupons")
    await dispatchNotification({
      type: "coupon_created",
      couponCode: coupon.code,
      uid: session.uid,
      channelsSent: [],
    })
    await logActivity("admin_action", `Coupon créé : ${coupon.code}`, {
      actorUid: session.uid,
      couponId: coupon.id,
    })
    return { success: true, data: coupon }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

export async function updateCouponAction(
  id: string,
  input: unknown
): Promise<ActionResult<Coupon>> {
  await requireSession("staff")
  const parsed = couponFormSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides.",
    }
  }

  if (await couponCodeExists(parsed.data.code, id)) {
    return { success: false, error: "Ce code existe déjà." }
  }

  try {
    const coupon = await updateCoupon(id, parsed.data)
    revalidatePath("/admin/coupons")
    return { success: true, data: coupon }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

export async function toggleCouponActiveAction(
  id: string,
  isActive: boolean
): Promise<ActionResult> {
  await requireSession("staff")
  try {
    await setCouponActive(id, isActive)
    revalidatePath("/admin/coupons")
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}
