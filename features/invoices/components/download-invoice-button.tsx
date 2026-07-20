import { DownloadIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

export function DownloadInvoiceButton({ orderId }: { orderId: string }) {
  return (
    <Button
      render={<a href={`/api/invoices/${orderId}/pdf`} />}
      nativeButton={false}
      variant="outline"
      size="sm"
    >
      <DownloadIcon />
      Télécharger la facture
    </Button>
  )
}
