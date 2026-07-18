"use client"

import { useRouter } from "next/navigation"
import { MapPinIcon, PencilIcon, TrashIcon } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { EmptyState } from "@/components/shared/empty-state"
import {
  deleteAddressAction,
  setDefaultAddressAction,
} from "@/features/profile/actions/address-actions"
import { AddressFormDialog } from "@/features/profile/components/address-form-dialog"
import type { AddressWithId } from "@/types/user"

interface AddressListProps {
  addresses: AddressWithId[]
}

export function AddressList({ addresses }: AddressListProps) {
  const router = useRouter()

  async function handleDelete(addressId: string) {
    const result = await deleteAddressAction(addressId)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    toast.success("Adresse supprimée.")
    router.refresh()
  }

  async function handleSetDefault(addressId: string) {
    const result = await setDefaultAddressAction(addressId)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    router.refresh()
  }

  if (addresses.length === 0) {
    return (
      <EmptyState
        icon={MapPinIcon}
        title="Aucune adresse enregistrée"
        description="Ajoutez une adresse pour accélérer vos prochaines livraisons."
        action={
          <AddressFormDialog trigger={<Button>Ajouter une adresse</Button>} />
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {addresses.map((address) => (
        <div
          key={address.id}
          className="flex items-start justify-between gap-4 rounded-xl border p-4"
        >
          <div className="flex flex-col gap-1 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">{address.label}</span>
              {address.isDefault ? (
                <Badge variant="secondary">Par défaut</Badge>
              ) : null}
            </div>
            <span>{address.recipientName}</span>
            <span className="text-muted-foreground">
              {address.line1}
              {address.line2 ? `, ${address.line2}` : ""}, {address.city},{" "}
              {address.region}
            </span>
            <span className="text-muted-foreground">{address.phone}</span>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {!address.isDefault ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleSetDefault(address.id)}
              >
                Définir par défaut
              </Button>
            ) : null}
            <AddressFormDialog
              address={address}
              trigger={
                <Button variant="ghost" size="icon" aria-label="Modifier">
                  <PencilIcon className="size-4" />
                </Button>
              }
            />
            <ConfirmDialog
              trigger={
                <Button variant="ghost" size="icon" aria-label="Supprimer">
                  <TrashIcon className="size-4" />
                </Button>
              }
              title="Supprimer cette adresse ?"
              description="Cette action est définitive."
              confirmLabel="Supprimer"
              destructive
              onConfirm={() => handleDelete(address.id)}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
