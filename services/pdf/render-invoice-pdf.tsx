import "server-only"
import { renderToBuffer } from "@react-pdf/renderer"

import { InvoicePdfDocument } from "@/features/invoices/components/invoice-pdf-document"
import type { Invoice } from "@/types/invoice"

export async function renderInvoicePdf(invoice: Invoice): Promise<Buffer> {
  return renderToBuffer(<InvoicePdfDocument invoice={invoice} />)
}
