"use server"

import { revalidatePath } from "next/cache"

import { requireSession } from "@/lib/session.server"
import { supplierFormSchema } from "@/schemas/supplier.schema"
import {
  createSupplier,
  setSupplierActive,
  updateSupplier,
} from "@/services/firestore/suppliers"
import type { ActionResult } from "@/types/action-result"
import type { Supplier } from "@/types/supplier"

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Une erreur est survenue."
}

export async function createSupplierAction(
  input: unknown
): Promise<ActionResult<Supplier>> {
  await requireSession("staff")
  const parsed = supplierFormSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides.",
    }
  }

  try {
    const supplier = await createSupplier(parsed.data)
    revalidatePath("/admin/suppliers")
    return { success: true, data: supplier }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

export async function updateSupplierAction(
  id: string,
  input: unknown
): Promise<ActionResult<Supplier>> {
  await requireSession("staff")
  const parsed = supplierFormSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides.",
    }
  }

  try {
    const supplier = await updateSupplier(id, parsed.data)
    revalidatePath("/admin/suppliers")
    revalidatePath(`/admin/suppliers/${id}`)
    return { success: true, data: supplier }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

export async function setSupplierActiveAction(
  id: string,
  isActive: boolean
): Promise<ActionResult> {
  await requireSession("staff")
  try {
    await setSupplierActive(id, isActive)
    revalidatePath("/admin/suppliers")
    revalidatePath(`/admin/suppliers/${id}`)
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}
