"use client"

import { useState } from "react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createCheckoutSessionAction } from "@/features/payment/actions/checkout-actions"
import { applyCouponAction } from "@/features/checkout/actions/apply-coupon-action"
import {
  PAYMENT_METHODS,
  SIMULATED_PAYMENT_METHOD,
} from "@/schemas/order.schema"
import type { DeliveryMethod, ShippingTier } from "@/types/order"
import type { AddressWithId } from "@/types/user"
import { useI18n } from "@/i18n/client"
import type { MessageKey } from "@/i18n/translate"

type PaymentMethod =
  (typeof PAYMENT_METHODS)[number] | typeof SIMULATED_PAYMENT_METHOD

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, MessageKey> = {
  stripe: "checkout.methods.card",
  paypal: "checkout.methods.paypal",
  simulation: "checkout.methods.simulation",
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
  /** Local emulators only: offers the simulated payment. */
  simulationEnabled?: boolean
}

export function CheckoutForm({
  addresses,
  pickupFeeMinor,
  standardFeeMinor,
  expressFeeMinor,
  currency,
  defaultPaymentMethod = "stripe",
  simulationEnabled = false,
}: CheckoutFormProps) {
  const { t, price } = useI18n()
  const paymentMethods: PaymentMethod[] = simulationEnabled
    ? [...PAYMENT_METHODS, SIMULATED_PAYMENT_METHOD]
    : [...PAYMENT_METHODS]
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
    freeShipping: boolean
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
      toast.success(t("checkout.coupon.applied"))
    } finally {
      setApplyingCoupon(false)
    }
  }

  async function handleSubmit() {
    if (deliveryMethod === "delivery" && !addressId) {
      toast.error(t("checkout.selectAddress"))
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
        <Label>{t("checkout.deliveryMethod")}</Label>
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
            <span className="block font-medium">{t("checkout.pickup")}</span>
            <span className="text-muted-foreground text-sm">
              {price(pickupFeeMinor, currency)}
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
            <span className="block font-medium">
              {t("checkout.homeDelivery")}
            </span>
            <span className="text-muted-foreground text-sm">
              {t("checkout.from", { price: price(standardFeeMinor, currency) })}
            </span>
          </button>
        </div>
      </div>

      {deliveryMethod === "delivery" ? (
        <div className="flex flex-col gap-2">
          <Label>{t("checkout.deliveryTier")}</Label>
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
              <span className="block font-medium">
                {t("checkout.standard")}
              </span>
              <span className="text-muted-foreground">
                {price(standardFeeMinor, currency)}
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
              <span className="block font-medium">{t("checkout.express")}</span>
              <span className="text-muted-foreground">
                {price(expressFeeMinor, currency)}
              </span>
            </button>
          </div>
        </div>
      ) : null}

      {deliveryMethod === "delivery" ? (
        <div className="flex flex-col gap-2">
          <Label>{t("checkout.deliveryAddress")}</Label>
          {addresses.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {t("checkout.noAddress")}{" "}
              <a
                href="/account/addresses"
                className="underline underline-offset-4"
              >
                {t("checkout.addAddress")}
              </a>
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
        <Label htmlFor="coupon">{t("checkout.coupon.label")}</Label>
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
            {applyingCoupon ? "…" : t("catalog.filters.apply")}
          </Button>
        </div>
        {appliedCoupon ? (
          <p className="text-sm text-green-600 dark:text-green-500">
            {appliedCoupon.freeShipping
              ? t("checkout.coupon.freeShipping", { code: appliedCoupon.code })
              : t("checkout.coupon.discount", {
                  amount: price(appliedCoupon.discountMinor, currency),
                  code: appliedCoupon.code,
                })}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label>{t("checkout.paymentMethod")}</Label>
        <div className="grid gap-3 sm:grid-cols-2">
          {paymentMethods.map((method) => (
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
                {t(PAYMENT_METHOD_LABELS[method])}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">{t("checkout.notes")}</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder={t("checkout.notesPlaceholder")}
        />
      </div>

      <Button
        type="button"
        size="lg"
        disabled={submitting}
        onClick={handleSubmit}
        className="w-full"
      >
        {submitting ? t("checkout.redirecting") : t("checkout.payNow")}
      </Button>
    </div>
  )
}
