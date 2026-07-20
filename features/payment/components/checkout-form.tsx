"use client"

import { useState } from "react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatPriceMinor } from "@/utils/currency"
import { createCheckoutSessionAction } from "@/features/payment/actions/checkout-actions"
import { applyCouponAction } from "@/features/checkout/actions/apply-coupon-action"
import { PAYMENT_METHODS } from "@/schemas/order.schema"
import type { DeliveryMethod, ShippingTier } from "@/types/order"
import type { AddressWithId } from "@/types/user"

type PaymentMethod = (typeof PAYMENT_METHODS)[number]

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  stripe: "Carte bancaire",
  paypal: "PayPal",
}

interface CheckoutFormProps {
  addresses: AddressWithId[]
  pickupFeeMinor: number
  standardFeeMinor: number
  expressFeeMinor: number
  currency: string
  /** Sprint 10A — only pre-selects the radio button; the checkout/payment
   * logic itself is unaffected (see `settings/payment` doc comment). */
  defaultPaymentMethod?: PaymentMethod
}

export function CheckoutForm({
  addresses,
  pickupFeeMinor,
  standardFeeMinor,
  expressFeeMinor,
  currency,
  defaultPaymentMethod = "stripe",
}: CheckoutFormProps) {
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("pickup")
  const [shippingTier, setShippingTier] = useState<ShippingTier>("standard")
  const [addressId, setAddressId] = useState<string | null>(
    addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? null
  )
  const [notes, setNotes] = useState("")
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>(defaultPaymentMethod)
  const [submitting, setSubmitting] = useState(false)

  const [couponInput, setCouponInput] = useState("")
  const [applyingCoupon, setApplyingCoupon] = useState(false)
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string
    discountMinor: number
  } | null>(null)

  async function handleApplyCoupon() {
    if (!couponInput.trim()) return
    setApplyingCoupon(true)
    try {
      const result = await applyCouponAction({ code: couponInput.trim() })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      setAppliedCoupon(result.data)
      toast.success("Code promo appliqué.")
    } finally {
      setApplyingCoupon(false)
    }
  }

  async function handleSubmit() {
    if (deliveryMethod === "delivery" && !addressId) {
      toast.error("Sélectionnez une adresse de livraison.")
      return
    }

    setSubmitting(true)
    try {
      const result = await createCheckoutSessionAction({
        deliveryMethod,
        shippingTier: deliveryMethod === "delivery" ? shippingTier : null,
        addressId: deliveryMethod === "delivery" ? addressId : null,
        notes: notes.trim() || null,
        couponCode: appliedCoupon?.code ?? null,
        paymentMethod,
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
              dès {formatPriceMinor(standardFeeMinor, currency)}
            </span>
          </button>
        </div>
      </div>

      {deliveryMethod === "delivery" ? (
        <div className="flex flex-col gap-2">
          <Label>Formule de livraison</Label>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setShippingTier("standard")}
              className={cn(
                "rounded-lg border p-3 text-left text-sm transition-colors",
                shippingTier === "standard"
                  ? "border-foreground"
                  : "border-input hover:bg-muted"
              )}
            >
              <span className="block font-medium">Standard</span>
              <span className="text-muted-foreground">
                {formatPriceMinor(standardFeeMinor, currency)}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setShippingTier("express")}
              className={cn(
                "rounded-lg border p-3 text-left text-sm transition-colors",
                shippingTier === "express"
                  ? "border-foreground"
                  : "border-input hover:bg-muted"
              )}
            >
              <span className="block font-medium">Express</span>
              <span className="text-muted-foreground">
                {formatPriceMinor(expressFeeMinor, currency)}
              </span>
            </button>
          </div>
        </div>
      ) : null}

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
        <Label htmlFor="coupon">Code promo (optionnel)</Label>
        <div className="flex gap-2">
          <Input
            id="coupon"
            value={couponInput}
            onChange={(event) => {
              setCouponInput(event.target.value)
              setAppliedCoupon(null)
            }}
            placeholder="ETE2026"
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            disabled={applyingCoupon || !couponInput.trim()}
            onClick={handleApplyCoupon}
          >
            {applyingCoupon ? "..." : "Appliquer"}
          </Button>
        </div>
        {appliedCoupon ? (
          <p className="text-sm text-green-600 dark:text-green-500">
            Réduction de{" "}
            {formatPriceMinor(appliedCoupon.discountMinor, currency)} appliquée
            avec le code {appliedCoupon.code}.
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label>Mode de paiement</Label>
        <div className="grid gap-3 sm:grid-cols-2">
          {PAYMENT_METHODS.map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => setPaymentMethod(method)}
              className={cn(
                "rounded-lg border p-3 text-left text-sm transition-colors",
                paymentMethod === method
                  ? "border-foreground"
                  : "border-input hover:bg-muted"
              )}
            >
              <span className="block font-medium">
                {PAYMENT_METHOD_LABELS[method]}
              </span>
            </button>
          ))}
        </div>
      </div>

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
