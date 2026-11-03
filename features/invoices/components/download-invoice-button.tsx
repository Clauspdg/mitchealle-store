import { DownloadIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { getI18n } from "@/i18n/server"

export async function DownloadInvoiceButton({ orderId }: { orderId: string }) {
  const { t } = await getI18n()
  return (
    <Button
      render={<a href={`/api/invoices/${orderId}/pdf`} />}
      nativeButton={false}
      variant="outline"
      size="sm"
    >
      <DownloadIcon />
      {t("orders.downloadInvoice")}
    </Button>
  )
}
