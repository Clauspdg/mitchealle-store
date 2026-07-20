import "server-only"
import { Timestamp } from "firebase-admin/firestore"

import { adminDb } from "@/firebase/admin"
import { getNextInvoiceNumber } from "@/services/firestore/counters"
import type { Invoice, InvoiceDocument } from "@/types/invoice"
import type { Order } from "@/types/order"

const INVOICES_COLLECTION = "invoices"

function toInvoice(id: string, data: FirebaseFirestore.DocumentData): Invoice {
  return { id, ...(data as InvoiceDocument) }
}

/**
 * Derives an invoice entirely from an already-paid `Order` and persists it
 * to `invoices/{orderId}` — one invoice per order, keyed by the order's own
 * id so this is naturally idempotent (re-calling for the same order just
 * overwrites the same doc with the same data, no duplicate invoice numbers
 * handed out). Called once, from `confirmOrderPayment`, not from
 * `createOrderFromCart` — an invoice is only meaningful once payment is
 * confirmed. Sprint 8 is the data model only; PDF rendering is Sprint 9.
 */
export async function generateInvoiceForOrder(order: Order): Promise<Invoice> {
  const ref = adminDb.collection(INVOICES_COLLECTION).doc(order.id)

  const existing = await ref.get()
  if (existing.exists) {
    return toInvoice(existing.id, existing.data()!)
  }

  const invoiceNumber = await getNextInvoiceNumber()
  const doc: InvoiceDocument = {
    invoiceNumber,
    orderId: order.id,
    userId: order.userId,
    customerEmail: order.customerEmail,
    addressSnapshot: order.delivery.addressSnapshot,
    items: order.items,
    subtotalMinor: order.subtotalMinor,
    shippingFeeMinor: order.shippingFeeMinor,
    discountMinor: order.discountMinor,
    taxMinor: order.taxMinor,
    totalMinor: order.totalMinor,
    currency: order.currency,
    createdAt: Timestamp.now(),
  }

  await ref.set(doc)
  return { id: order.id, ...doc }
}

export async function getInvoiceForOrder(
  orderId: string
): Promise<Invoice | null> {
  const doc = await adminDb.collection(INVOICES_COLLECTION).doc(orderId).get()
  return doc.exists ? toInvoice(doc.id, doc.data()!) : null
}
