import "server-only"
import { FieldValue } from "firebase-admin/firestore"

import { adminDb } from "@/firebase/admin"
import type { AddressFormInput } from "@/schemas/address.schema"
import type { AddressWithId } from "@/types/user"

const USERS_COLLECTION = "users"
const ADDRESSES_SUBCOLLECTION = "addresses"

function addressesRef(uid: string) {
  return adminDb
    .collection(USERS_COLLECTION)
    .doc(uid)
    .collection(ADDRESSES_SUBCOLLECTION)
}

function toAddress(
  id: string,
  data: FirebaseFirestore.DocumentData
): AddressWithId {
  return { id, ...(data as AddressFormInput) }
}

export async function listAddresses(uid: string): Promise<AddressWithId[]> {
  const snapshot = await addressesRef(uid).get()
  return snapshot.docs.map((doc) => toAddress(doc.id, doc.data()))
}

export async function getAddress(
  uid: string,
  addressId: string
): Promise<AddressWithId | null> {
  const doc = await addressesRef(uid).doc(addressId).get()
  return doc.exists ? toAddress(doc.id, doc.data()!) : null
}

export async function createAddress(
  uid: string,
  input: AddressFormInput
): Promise<AddressWithId> {
  const ref = await addressesRef(uid).add(input)

  if (input.isDefault) {
    await setDefaultAddress(uid, ref.id)
  }

  const created = await ref.get()
  return toAddress(created.id, created.data()!)
}

export async function updateAddress(
  uid: string,
  addressId: string,
  input: AddressFormInput
): Promise<AddressWithId> {
  await addressesRef(uid).doc(addressId).set(input)

  if (input.isDefault) {
    await setDefaultAddress(uid, addressId)
  }

  return (await getAddress(uid, addressId))!
}

export async function deleteAddress(
  uid: string,
  addressId: string
): Promise<void> {
  await addressesRef(uid).doc(addressId).delete()
}

/**
 * Marks `addressId` as the default, clearing the previous default (if any)
 * in the same `WriteBatch`, and patches `users/{uid}.defaultAddressId`.
 */
export async function setDefaultAddress(
  uid: string,
  addressId: string
): Promise<void> {
  const batch = adminDb.batch()

  const previousDefaultSnapshot = await addressesRef(uid)
    .where("isDefault", "==", true)
    .get()

  previousDefaultSnapshot.docs.forEach((doc) => {
    if (doc.id !== addressId) {
      batch.update(doc.ref, { isDefault: false })
    }
  })

  batch.update(addressesRef(uid).doc(addressId), { isDefault: true })
  batch.update(adminDb.collection(USERS_COLLECTION).doc(uid), {
    defaultAddressId: addressId,
    updatedAt: FieldValue.serverTimestamp(),
  })

  await batch.commit()
}
