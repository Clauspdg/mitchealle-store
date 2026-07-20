"use client"

import { useState } from "react"
import { toast } from "sonner"

import {
  createReturnRequestAction,
  uploadReturnPhotoAction,
} from "@/features/returns/actions/return-actions"
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
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import type { Order } from "@/types/order"

export function RequestReturnDialog({ order }: { order: Order }) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const [comment, setComment] = useState("")
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  function itemKey(productId: string, variantId: string) {
    return `${productId}_${variantId}`
  }

  function toggleItem(key: string) {
    setSelectedKeys((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function handlePhotoChange(file: File | undefined) {
    if (!file) return
    setUploadingPhoto(true)
    try {
      const formData = new FormData()
      formData.set("file", file)
      const result = await uploadReturnPhotoAction(formData)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      setPhotoUrl(result.data.url)
    } finally {
      setUploadingPhoto(false)
    }
  }

  async function handleSubmit() {
    if (selectedKeys.size === 0) {
      toast.error("Sélectionnez au moins un article.")
      return
    }

    const items = order.items
      .filter((item) =>
        selectedKeys.has(itemKey(item.productId, item.variantId))
      )
      .map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        reason: reasons[itemKey(item.productId, item.variantId)] ?? "",
      }))

    if (items.some((item) => !item.reason.trim())) {
      toast.error("Indiquez un motif pour chaque article sélectionné.")
      return
    }

    setSubmitting(true)
    try {
      const result = await createReturnRequestAction({
        orderId: order.id,
        items,
        comment: comment.trim() || null,
        photoUrls: photoUrl ? [photoUrl] : [],
      })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success("Demande de retour envoyée.")
      setOpen(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Demander un retour
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Demander un retour</DialogTitle>
          <DialogDescription>
            Sélectionnez les articles concernés et indiquez un motif.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {order.items.map((item) => {
            const key = itemKey(item.productId, item.variantId)
            const checked = selectedKeys.has(key)
            return (
              <div
                key={key}
                className="flex flex-col gap-2 rounded-lg border p-3"
              >
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`return-item-${key}`}
                    checked={checked}
                    onCheckedChange={() => toggleItem(key)}
                  />
                  <Label htmlFor={`return-item-${key}`} className="text-sm">
                    {item.nameSnapshot} × {item.quantity}
                  </Label>
                </div>
                {checked ? (
                  <Input
                    placeholder="Motif du retour"
                    value={reasons[key] ?? ""}
                    onChange={(event) =>
                      setReasons((current) => ({
                        ...current,
                        [key]: event.target.value,
                      }))
                    }
                  />
                ) : null}
              </div>
            )
          })}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="return-comment">Commentaire (optionnel)</Label>
            <Textarea
              id="return-comment"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="return-photo">Photo (optionnel)</Label>
            <Input
              id="return-photo"
              type="file"
              accept="image/*"
              disabled={uploadingPhoto}
              onChange={(event) => handlePhotoChange(event.target.files?.[0])}
            />
            {photoUrl ? (
              <p className="text-muted-foreground text-xs">Photo ajoutée.</p>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" disabled={submitting} onClick={handleSubmit}>
            {submitting ? "Envoi..." : "Envoyer la demande"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
