"use client"

import { useState, type ReactElement } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import {
  createCouponAction,
  updateCouponAction,
} from "@/features/coupons/actions/coupon-actions"
import { couponFormSchema, type CouponFormInput } from "@/schemas/coupon.schema"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
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
import { Switch } from "@/components/ui/switch"
import type { Coupon } from "@/types/coupon"

interface CouponFormDialogProps {
  trigger: ReactElement
  coupon?: Coupon
}

function couponToFormDefaults(coupon?: Coupon): CouponFormInput {
  return {
    code: coupon?.code ?? "",
    type: coupon?.type ?? "percentage",
    value: coupon?.value ?? 10,
    expiresAt: coupon?.expiresAt?.toDate() ?? null,
    maxUses: coupon?.maxUses ?? null,
    minPurchaseMinor: coupon?.minPurchaseMinor ?? null,
    allowedCategoryIds: coupon?.allowedCategoryIds ?? null,
    allowedProductIds: coupon?.allowedProductIds ?? null,
    allowedUserIds: coupon?.allowedUserIds ?? null,
    isActive: coupon?.isActive ?? true,
  }
}

export function CouponFormDialog({ trigger, coupon }: CouponFormDialogProps) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CouponFormInput>({
    resolver: zodResolver(couponFormSchema),
    defaultValues: couponToFormDefaults(coupon),
  })

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) reset(couponToFormDefaults(coupon))
  }

  async function onSubmit(data: CouponFormInput) {
    setSubmitting(true)
    try {
      const result = coupon
        ? await updateCouponAction(coupon.id, data)
        : await createCouponAction(data)

      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success(coupon ? "Coupon mis à jour." : "Coupon créé.")
      setOpen(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {coupon ? "Modifier le coupon" : "Nouveau coupon"}
          </DialogTitle>
          <DialogDescription>
            Le code est insensible à la casse et stocké en majuscules.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="coupon-code">Code</Label>
            <Input
              id="coupon-code"
              {...register("code")}
              placeholder="ETE2026"
            />
            {errors.code && (
              <p className="text-destructive text-sm">{errors.code.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Type</Label>
              <Select
                value={watch("type")}
                onValueChange={(value) =>
                  setValue("type", value as CouponFormInput["type"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Pourcentage</SelectItem>
                  <SelectItem value="fixed">Montant fixe</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="coupon-value">
                Valeur {watch("type") === "percentage" ? "(%)" : "(HTG)"}
              </Label>
              <Input
                id="coupon-value"
                type="number"
                step="0.01"
                {...register("value", { valueAsNumber: true })}
              />
              {errors.value && (
                <p className="text-destructive text-sm">
                  {errors.value.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Expiration (optionnel)</Label>
              <DatePicker
                date={watch("expiresAt") ?? undefined}
                onSelect={(date) => setValue("expiresAt", date ?? null)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="coupon-max-uses">
                Utilisations max (optionnel)
              </Label>
              <Input
                id="coupon-max-uses"
                type="number"
                value={watch("maxUses") ?? ""}
                onChange={(event) =>
                  setValue(
                    "maxUses",
                    event.target.value === ""
                      ? null
                      : Number(event.target.value)
                  )
                }
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="coupon-min-purchase">
              Achat minimum en HTG (optionnel)
            </Label>
            <Input
              id="coupon-min-purchase"
              type="number"
              value={watch("minPurchaseMinor") ?? ""}
              onChange={(event) =>
                setValue(
                  "minPurchaseMinor",
                  event.target.value === "" ? null : Number(event.target.value)
                )
              }
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex flex-col">
              <Label htmlFor="coupon-active">Actif</Label>
              <span className="text-muted-foreground text-sm">
                Un coupon inactif ne peut plus être appliqué.
              </span>
            </div>
            <Switch
              id="coupon-active"
              checked={watch("isActive")}
              onCheckedChange={(checked) => setValue("isActive", checked)}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
