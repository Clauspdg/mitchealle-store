import type { Metadata } from "next"
import { PlusIcon } from "lucide-react"

import { requireSession } from "@/lib/session.server"
import { listAddresses } from "@/services/firestore/addresses"
import { Button } from "@/components/ui/button"
import { AddressFormDialog } from "@/features/profile/components/address-form-dialog"
import { AddressList } from "@/features/profile/components/address-list"
import { getI18n } from "@/i18n/server"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: t("account.addresses.title") }
}

export default async function AddressesPage() {
  const { t } = await getI18n()
  const session = await requireSession("customer")
  const addresses = await listAddresses(session.uid)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-semibold tracking-tight">
          {t("account.addresses.title")}
        </h1>
        {addresses.length > 0 ? (
          <AddressFormDialog
            trigger={
              <Button size="sm">
                <PlusIcon />
                {t("common.add")}
              </Button>
            }
          />
        ) : null}
      </div>

      <AddressList addresses={addresses} />
    </div>
  )
}
