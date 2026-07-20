import type { Address } from "./user"
import type { OrderItem } from "./order"
import type { FirestoreTimestamp } from "./firestore"

/**
 * Exact shape of an `invoices/{orderId}` Firestore document — derived
 * entirely from an `Order` at payment-confirmation time (see
 * `services/firestore/invoices.ts`'s `generateInvoiceForOrder`). Data
 * model only this sprint: no PDF rendering yet (Sprint 9), but every field
 * a PDF template would need is already here.
 */
export interface InvoiceDocument {
  invoiceNumber: string
  orderId: string
  userId: string
  customerEmail: string
  addressSnapshot: Address | null
  items: OrderItem[]
  subtotalMinor: number
  shippingFeeMinor: number
  discountMinor: number
  taxMinor: number
  totalMinor: number
  currency: string
  createdAt: FirestoreTimestamp
}

export interface Invoice extends InvoiceDocument {
  id: string
}
