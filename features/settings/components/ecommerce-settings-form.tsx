"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import {
  updateNotificationSettingsAction,
  updatePaymentSettingsAction,
  updateShippingSettingsAction,
} from "@/features/settings/actions/ecommerce-settings-actions"
import {
  notificationSettingsFormSchema,
  paymentSettingsFormSchema,
  shippingSettingsFormSchema,
  type NotificationSettingsFormInput,
  type PaymentSettingsFormInput,
  type ShippingSettingsFormInput,
} from "@/schemas/settings.schema"
import { MoneyInput } from "@/components/shared/money-input"
import { TagsInput } from "@/components/shared/tags-input"
import { Button } from "@/components/ui/button"
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
import { PAYMENT_PROVIDERS } from "@/types/settings"
import type {
  NotificationSettings,
  PaymentSettings,
  ShippingSettings,
} from "@/types/settings"

function ShippingSection({ settings }: { settings: ShippingSettings }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const { register, handleSubmit, watch, setValue } =
    useForm<ShippingSettingsFormInput>({
      resolver: zodResolver(shippingSettingsFormSchema),
      defaultValues: {
        standardFeeMinor: settings.standardFeeMinor,
        expressFeeMinor: settings.expressFeeMinor,
        freeShippingThresholdMinor: settings.freeShippingThresholdMinor,
        taxRatePercent: settings.taxRatePercent,
        pickupEnabled: settings.pickupEnabled,
        deliveryEnabled: settings.deliveryEnabled,
      },
    })

  async function onSubmit(data: ShippingSettingsFormInput) {
    setSaving(true)
    try {
      const result = await updateShippingSettingsAction(data)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success("Paramètres de livraison enregistrés.")
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      noValidate
    >
      <h2 className="font-heading text-lg font-medium">Livraison & Taxes</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="standardFeeMinor">Frais — Standard</Label>
          <MoneyInput
            id="standardFeeMinor"
            valueMinor={watch("standardFeeMinor")}
            onChangeMinor={(minor) => setValue("standardFeeMinor", minor ?? 0)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="expressFeeMinor">Frais — Express</Label>
          <MoneyInput
            id="expressFeeMinor"
            valueMinor={watch("expressFeeMinor")}
            onChangeMinor={(minor) => setValue("expressFeeMinor", minor ?? 0)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="freeShippingThresholdMinor">
            Seuil de livraison gratuite
          </Label>
          <MoneyInput
            id="freeShippingThresholdMinor"
            valueMinor={watch("freeShippingThresholdMinor")}
            onChangeMinor={(minor) =>
              setValue("freeShippingThresholdMinor", minor)
            }
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="taxRatePercent">Taux de TVA (%)</Label>
          <Input
            id="taxRatePercent"
            type="number"
            min="0"
            max="100"
            step="0.01"
            {...register("taxRatePercent", { valueAsNumber: true })}
          />
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Switch
            id="pickupEnabled"
            checked={watch("pickupEnabled")}
            onCheckedChange={(checked) => setValue("pickupEnabled", checked)}
          />
          <Label htmlFor="pickupEnabled" className="font-normal">
            Retrait en boutique
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="deliveryEnabled"
            checked={watch("deliveryEnabled")}
            onCheckedChange={(checked) => setValue("deliveryEnabled", checked)}
          />
          <Label htmlFor="deliveryEnabled" className="font-normal">
            Livraison à domicile
          </Label>
        </div>
      </div>
      <div>
        <Button type="submit" disabled={saving}>
          {saving ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>
    </form>
  )
}

function PaymentSection({ settings }: { settings: PaymentSettings }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const { handleSubmit, watch, setValue } = useForm<PaymentSettingsFormInput>({
    resolver: zodResolver(paymentSettingsFormSchema),
    defaultValues: { defaultProvider: settings.defaultProvider },
  })

  async function onSubmit(data: PaymentSettingsFormInput) {
    setSaving(true)
    try {
      const result = await updatePaymentSettingsAction(data)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success("Paramètre de paiement enregistré.")
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      noValidate
    >
      <h2 className="font-heading text-lg font-medium">Paiements</h2>
      <p className="text-muted-foreground text-sm">
        Détermine uniquement le mode pré-sélectionné au moment du paiement —
        n&apos;affecte pas l&apos;intégration Stripe/PayPal elle-même.
      </p>
      <div className="flex flex-col gap-1.5 sm:max-w-xs">
        <Label htmlFor="defaultProvider">Fournisseur par défaut</Label>
        <Select
          value={watch("defaultProvider")}
          onValueChange={(value) =>
            setValue(
              "defaultProvider",
              value as PaymentSettingsFormInput["defaultProvider"]
            )
          }
        >
          <SelectTrigger id="defaultProvider">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_PROVIDERS.map((provider) => (
              <SelectItem key={provider} value={provider}>
                {provider === "stripe" ? "Stripe" : "PayPal"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Button type="submit" disabled={saving}>
          {saving ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>
    </form>
  )
}

function NotificationsSection({
  settings,
}: {
  settings: NotificationSettings
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const { handleSubmit, watch, setValue } =
    useForm<NotificationSettingsFormInput>({
      resolver: zodResolver(notificationSettingsFormSchema),
      defaultValues: { adminAlertEmails: settings.adminAlertEmails },
    })

  async function onSubmit(data: NotificationSettingsFormInput) {
    setSaving(true)
    try {
      const result = await updateNotificationSettingsAction(data)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success("Alertes admin enregistrées.")
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
      noValidate
    >
      <h2 className="font-heading text-lg font-medium">Alertes admin</h2>
      <p className="text-muted-foreground text-sm">
        Destinataires internes notifiés à chaque nouvelle commande.
      </p>
      <div className="flex flex-col gap-1.5">
        <Label>Adresses e-mail</Label>
        <TagsInput
          value={watch("adminAlertEmails")}
          onChange={(emails) => setValue("adminAlertEmails", emails)}
          placeholder="Ajouter une adresse e-mail..."
        />
      </div>
      <div>
        <Button type="submit" disabled={saving}>
          {saving ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>
    </form>
  )
}

export function EcommerceSettingsForm({
  shipping,
  payment,
  notifications,
}: {
  shipping: ShippingSettings
  payment: PaymentSettings
  notifications: NotificationSettings
}) {
  return (
    <div className="flex flex-col gap-10">
      <ShippingSection settings={shipping} />
      <PaymentSection settings={payment} />
      <NotificationsSection settings={notifications} />
    </div>
  )
}
