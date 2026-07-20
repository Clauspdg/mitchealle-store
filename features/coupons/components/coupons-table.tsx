"use client"

import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { toggleCouponActiveAction } from "@/features/coupons/actions/coupon-actions"
import { CouponFormDialog } from "@/features/coupons/components/coupon-form-dialog"
import { formatPriceMinor } from "@/utils/currency"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Coupon } from "@/types/coupon"

function formatValue(coupon: Coupon): string {
  return coupon.type === "percentage"
    ? `-${coupon.value}%`
    : `-${formatPriceMinor(coupon.value, "HTG")}`
}

export function CouponsTable({ coupons }: { coupons: Coupon[] }) {
  const router = useRouter()

  async function handleToggle(id: string, next: boolean) {
    const result = await toggleCouponActiveAction(id, next)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    router.refresh()
  }

  if (coupons.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-center">
        <p className="font-medium">Aucun coupon</p>
        <p className="text-muted-foreground text-sm">
          Créez votre premier code promo.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Réduction</TableHead>
            <TableHead>Utilisations</TableHead>
            <TableHead>Expiration</TableHead>
            <TableHead>Actif</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {coupons.map((coupon) => (
            <TableRow key={coupon.id}>
              <TableCell className="font-mono font-medium">
                {coupon.code}
              </TableCell>
              <TableCell>{formatValue(coupon)}</TableCell>
              <TableCell className="text-muted-foreground">
                {coupon.usedCount}
                {coupon.maxUses !== null ? ` / ${coupon.maxUses}` : ""}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {coupon.expiresAt
                  ? coupon.expiresAt.toDate().toLocaleDateString("fr-FR")
                  : "—"}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={coupon.isActive}
                    onCheckedChange={(checked) =>
                      handleToggle(coupon.id, checked)
                    }
                    aria-label={coupon.isActive ? "Désactiver" : "Activer"}
                  />
                  {!coupon.isActive ? (
                    <Badge variant="secondary">Inactif</Badge>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <CouponFormDialog
                  coupon={coupon}
                  trigger={
                    <Button variant="outline" size="sm">
                      Modifier
                    </Button>
                  }
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
