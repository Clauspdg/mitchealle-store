"use client"

import { useState, type ReactElement } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { adjustInventoryAction } from "@/features/inventory/actions/inventory-actions"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Inventory } from "@/types/inventory"

export function AdjustInventoryDialog({
  trigger,
  inventory,
}: {
  trigger: ReactElement
  inventory: Inventory
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [field, setField] = useState<"quantityOnHand" | "quantityDamaged">(
    "quantityOnHand"
  )
  const [newQuantity, setNewQuantity] = useState(inventory.quantityOnHand)
  const [reason, setReason] = useState("")

  function handleFieldChange(value: string | null) {
    if (!value) return
    const nextField = value as "quantityOnHand" | "quantityDamaged"
    setField(nextField)
    setNewQuantity(
      nextField === "quantityOnHand"
        ? inventory.quantityOnHand
        : inventory.quantityDamaged
    )
  }

  async function handleSubmit() {
    if (reason.trim() === "") {
      toast.error("Un motif est requis pour tout ajustement.")
      return
    }

    setSubmitting(true)
    try {
      const result = await adjustInventoryAction({
        productId: inventory.productId,
        variantId: inventory.variantId,
        field,
        newQuantity,
        reason: reason.trim(),
      })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success("Ajustement enregistré.")
      setOpen(false)
      setReason("")
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Ajustement manuel</DialogTitle>
          <DialogDescription>
            Corrige une quantité physique (comptage, casse...). Un motif est
            obligatoire et reste consigné dans l&apos;historique.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Quantité à ajuster</Label>
            <Select value={field} onValueChange={handleFieldChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="quantityOnHand">
                  Stock physique (onHand)
                </SelectItem>
                <SelectItem value="quantityDamaged">Stock endommagé</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="newQuantity">Nouvelle quantité</Label>
            <Input
              id="newQuantity"
              type="number"
              min="0"
              value={newQuantity}
              onChange={(event) =>
                setNewQuantity(Number(event.target.value) || 0)
              }
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="adjust-reason">Motif (obligatoire)</Label>
            <Input
              id="adjust-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Ex. comptage physique, casse..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Enregistrement..." : "Confirmer l'ajustement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
