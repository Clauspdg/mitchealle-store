"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { setSupplierActiveAction } from "@/features/inventory/actions/supplier-actions"
import { SupplierFormDialog } from "@/features/inventory/components/supplier-form-dialog"
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
import type { Supplier } from "@/types/supplier"

export function SuppliersTable({ suppliers }: { suppliers: Supplier[] }) {
  const router = useRouter()

  async function toggleActive(supplier: Supplier, isActive: boolean) {
    const result = await setSupplierActiveAction(supplier.id, isActive)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    toast.success(isActive ? "Fournisseur activé." : "Fournisseur désactivé.")
    router.refresh()
  }

  if (suppliers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-center">
        <p className="font-medium">Aucun fournisseur</p>
        <p className="text-muted-foreground text-sm">
          Ajoutez votre premier fournisseur pour suivre vos arrivages.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Pays</TableHead>
            <TableHead>Devise</TableHead>
            <TableHead>Délai moyen</TableHead>
            <TableHead>Actif</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {suppliers.map((supplier) => (
            <TableRow key={supplier.id}>
              <TableCell className="font-medium">
                <Link
                  href={`/admin/suppliers/${supplier.id}`}
                  className="hover:underline"
                >
                  {supplier.name}
                </Link>
                {supplier.company && (
                  <span className="text-muted-foreground block text-xs">
                    {supplier.company}
                  </span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {supplier.contactName ?? "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {supplier.country ?? "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {supplier.currency}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {supplier.averageLeadTimeDays !== null
                  ? `${supplier.averageLeadTimeDays} j`
                  : "—"}
              </TableCell>
              <TableCell>
                <Switch
                  checked={supplier.isActive}
                  onCheckedChange={(checked) => toggleActive(supplier, checked)}
                  aria-label="Basculer l'activation"
                />
              </TableCell>
              <TableCell className="text-right">
                <SupplierFormDialog
                  supplier={supplier}
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
