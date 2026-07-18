"use server"

import { revalidatePath } from "next/cache"

import { requireSession } from "@/lib/session.server"
import { addressFormSchema } from "@/schemas/address.schema"
import {
  createAddress,
  deleteAddress,
  setDefaultAddress,
  updateAddress,
} from "@/services/firestore/addresses"
import type { ActionResult } from "@/types/action-result"
import type { AddressWithId } from "@/types/user"

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Une erreur est survenue."
}

export async function createAddressAction(
  input: unknown
): Promise<ActionResult<AddressWithId>> {
  const session = await requireSession("customer")
  const parsed = addressFormSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides.",
    }
  }

  try {
    const address = await createAddress(session.uid, parsed.data)
    revalidatePath("/account/addresses")
    return { success: true, data: address }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

export async function updateAddressAction(
  addressId: string,
  input: unknown
): Promise<ActionResult<AddressWithId>> {
  const session = await requireSession("customer")
  const parsed = addressFormSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides.",
    }
  }

  try {
    const address = await updateAddress(session.uid, addressId, parsed.data)
    revalidatePath("/account/addresses")
    return { success: true, data: address }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

export async function deleteAddressAction(
  addressId: string
): Promise<ActionResult> {
  const session = await requireSession("customer")
  try {
    await deleteAddress(session.uid, addressId)
    revalidatePath("/account/addresses")
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}

export async function setDefaultAddressAction(
  addressId: string
): Promise<ActionResult> {
  const session = await requireSession("customer")
  try {
    await setDefaultAddress(session.uid, addressId)
    revalidatePath("/account/addresses")
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error: errorMessage(error) }
  }
}
