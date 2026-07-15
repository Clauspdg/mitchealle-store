"use client"

import { useState, type ReactElement } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { receiveShipmentAction } from "@/features/inventory/actions/shipment-actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { IncomingShipment } from "@/types/incoming-shipment"
import type { Product } from "@/types/product"

interface ReceiveShipmentDialogProps {
  trigger: ReactElement
  shipment: IncomingShipment
  productsById: Record<string, Product>
}

export function ReceiveShipmentDialog({
  trigger,
  shipment,
  productsById,
}: ReceiveShipmentDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [quantities, setQuantities] = useState<Record<string, number>>({})

  function itemKey(productId: string, variantId: string) {
    return `${productId}_${variantId}`
  }

  function remainingFor(item: IncomingShipment["items"][number]) {
    return item.quantityOrdered - item.quantityReceived
  }

  async function handleSubmit() {
    const items = shipment.items
      .map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        quantityReceivedNow:
          quantities[itemKey(item.productId, item.variantId)] ?? 0,
      }))
      .filter((item) => item.quantityReceivedNow > 0)

    if (items.length === 0) {
      toast.error("Saisissez au moins une quantité reçue.")
      return
    }

    setSubmitting(true)
    try {
      const result = await receiveShipmentAction({
        shipmentId: shipment.id,
        items,
      })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success("Réception enregistrée — inventaire mis à jour.")
      setOpen(false)
      setQuantities({})
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Réceptionner l&apos;arrivage {shipment.reference}
          </DialogTitle>
          <DialogDescription>
            Saisissez les quantités effectivement reçues pour chaque produit.
            L&apos;inventaire est mis à jour immédiatement et de façon
            transactionnelle.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {shipment.items.map((item) => {
            const key = itemKey(item.productId, item.variantId)
            const remaining = remainingFor(item)
            const product = productsById[item.productId]

            return (
              <div
                key={key}
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium">
                    {product?.name ?? item.productId}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Commandé : {item.quantityOrdered} — déjà reçu :{" "}
                    {item.quantityReceived}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor={`receive-${key}`} className="sr-only">
                    Quantité reçue maintenant
                  </Label>
                  <Input
                    id={`receive-${key}`}
                    type="number"
                    min="0"
                    max={remaining}
                    className="w-24"
                    disabled={remaining <= 0}
                    value={quantities[key] ?? 0}
                    onChange={(event) =>
                      setQuantities((prev) => ({
                        ...prev,
                        [key]: Math.min(
                          remaining,
                          Number(event.target.value) || 0
                        ),
                      }))
                    }
                  />
                </div>
              </div>
            )
          })}
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Enregistrement..." : "Confirmer la réception"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
