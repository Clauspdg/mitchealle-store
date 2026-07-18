import type { FirestoreTimestamp } from "./firestore"
import type { Role } from "./roles"

/** Mirrors `users/{uid}` — see docs/firestore-architecture.md §2.1. */
export interface UserProfile {
  uid: string
  email: string
  displayName: string
  phone: string | null
  photoURL: string | null
  role: Role
  locale: string
  defaultAddressId: string | null
  marketingOptIn: boolean
  createdAt: FirestoreTimestamp
  updatedAt: FirestoreTimestamp
}

/** Mirrors `users/{uid}/addresses/{addressId}`. */
export interface Address {
  label: string
  recipientName: string
  phone: string
  line1: string
  line2: string | null
  city: string
  region: string
  postalCode: string | null
  country: string
  isDefault: boolean
}

/** `Address` plus the Firestore document ID — used everywhere in app code. */
export interface AddressWithId extends Address {
  id: string
}
