import type { Address } from "./user"
import type { FirestoreTimestamp } from "./firestore"

/** Mirrors `suppliers/{supplierId}` — see docs/firestore-architecture.md §2.10. */
export interface SupplierDocument {
  name: string
  company: string | null
  contactName: string | null
  email: string | null
  phone: string | null
  country: string | null
  address: Address | null
  currency: string
  paymentTerms: string | null
  averageLeadTimeDays: number | null
  isActive: boolean
  notes: string | null
  createdAt: FirestoreTimestamp
  updatedAt: FirestoreTimestamp
}

export interface Supplier extends SupplierDocument {
  id: string
}
