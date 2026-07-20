import { NextResponse } from "next/server"

import { getSession } from "@/lib/session.server"
import { getOrder } from "@/services/firestore/orders"
import { getInvoiceForOrder } from "@/services/firestore/invoices"
import { renderInvoicePdf } from "@/services/pdf/render-invoice-pdf"
import { hasRoleAtLeast } from "@/types/roles"

export const runtime = "nodejs"

interface RouteParams {
  params: Promise<{ orderId: string }>
}

export async function GET(_request: Request, { params }: RouteParams) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  }

  const { orderId } = await params
  const order = await getOrder(orderId)
  if (!order) {
    return NextResponse.json({ error: "Commande introuvable" }, { status: 404 })
  }

  const canAccess =
    order.userId === session.uid || hasRoleAtLeast(session.role, "staff")
  if (!canAccess) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
  }

  const invoice = await getInvoiceForOrder(orderId)
  if (!invoice) {
    return NextResponse.json(
      { error: "Aucune facture n'existe encore pour cette commande." },
      { status: 404 }
    )
  }

  const pdfBuffer = await renderInvoicePdf(invoice)

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoice.invoiceNumber}.pdf"`,
    },
  })
}
