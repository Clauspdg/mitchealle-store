import type { Metadata } from "next"
import { PlusIcon } from "lucide-react"

import { requireSession } from "@/lib/session.server"
import { listCoupons } from "@/services/firestore/coupons"
import { AdminSidebar } from "@/components/layout/admin-sidebar"
import { CouponFormDialog } from "@/features/coupons/components/coupon-form-dialog"
import { CouponsTable } from "@/features/coupons/components/coupons-table"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = { title: "Coupons" }

export default async function CouponsPage() {
  await requireSession("staff")
  const coupons = await listCoupons()

  return (
    <div className="flex flex-1">
      <AdminSidebar />
      <div className="flex w-full flex-col gap-6 px-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">Coupons</h1>
          <CouponFormDialog
            trigger={
              <Button>
                <PlusIcon />
                Ajouter un coupon
              </Button>
            }
          />
        </div>

        <CouponsTable coupons={coupons} />
      </div>
    </div>
  )
}
