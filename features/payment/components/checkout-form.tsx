"use client"

import { useState } from "react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatPriceMinor } from "@/utils/currency"
import { createCheckoutSessionAction } from "@/features/payment/actions/checkout-actions"
import type { DeliveryMethod } from "@/types/order"
import type { AddressWithId } from "@/types/user"

interface CheckoutFormProps {
  addresses: AddressWithId[]
  pickupFeeMinor: number
  deliveryFeeMinor: number
  currency: string
}

export function CheckoutForm({
  addresses,
  pickupFeeMinor,
  deliveryFeeMinor,
  currency,
}: CheckoutFormProps) {
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("pickup")
  const [addressId, setAddressId] = useState<string | null>(
    addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? null
  )
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (deliveryMethod === "delivery" && !addressId) {
      toast.error("Sélectionnez une adresse de livraison.")
      return
    }

    setSubmitting(true)
    try {
      const result = await createCheckoutSessionAction({
        deliveryMethod,
        addressId: deliveryMethod === "delivery" ? addressId : null,
        notes: notes.trim() || null,
      })

      if (!result.success) {
        toast.error(result.error)
        return
      }

      window.location.href = result.data.url
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label>Mode de livraison</Label>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setDeliveryMethod("pickup")}
            className={cn(
              "rounded-lg border p-4 text-left transition-colors",
              deliveryMethod === "pickup"
                ? "border-foreground"
                : "border-input hover:bg-muted"
            )}
          >
            <span className="block font-medium">Retrait en boutique</span>
            <span className="text-muted-foreground text-sm">
              {formatPriceMinor(pickupFeeMinor, currency)}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setDeliveryMethod("delivery")}
            className={cn(
              "rounded-lg border p-4 text-left transition-colors",
              deliveryMethod === "delivery"
                ? "border-foreground"
                : "border-input hover:bg-muted"
            )}
          >
            <span className="block font-medium">Livraison à domicile</span>
            <span className="text-muted-foreground text-sm">
              {formatPriceMinor(deliveryFeeMinor, currency)}
            </span>
          </button>
        </div>
      </div>

      {deliveryMethod === "delivery" ? (
        <div className="flex flex-col gap-2">
          <Label>Adresse de livraison</Label>
          {addresses.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Aucune adresse enregistrée.{" "}
              <a
                href="/account/addresses"
                className="underline underline-offset-4"
              >
                Ajoutez-en une
              </a>{" "}
              avant de continuer.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {addresses.map((address) => (
                <button
                  key={address.id}
                  type="button"
                  onClick={() => setAddressId(address.id)}
                  className={cn(
                    "rounded-lg border p-3 text-left text-sm transition-colors",
                    addressId === address.id
                      ? "border-foreground"
                      : "border-input hover:bg-muted"
                  )}
                >
                  <span className="block font-medium">{address.label}</span>
                  <span className="text-muted-foreground">
                    {address.line1}, {address.city}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Notes (optionnel)</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Instructions particulières..."
        />
      </div>

      <Button
        type="button"
        size="lg"
        disabled={submitting}
        onClick={handleSubmit}
        className="w-full"
      >
        {submitting ? "Redirection vers le paiement..." : "Payer maintenant"}
      </Button>
    </div>
  )
}
