import Link from "next/link"

import { ReturnStatusBadge } from "@/features/returns/components/return-status-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Return } from "@/types/return"

export function ReturnsTable({ returns }: { returns: Return[] }) {
  if (returns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-center">
        <p className="font-medium">Aucune demande de retour</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Commande</TableHead>
            <TableHead>Articles</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {returns.map((returnRequest) => (
            <TableRow key={returnRequest.id} className="hover:bg-muted/50">
              <TableCell className="font-medium">
                <Link
                  href={`/admin/returns/${returnRequest.id}`}
                  className="hover:underline"
                >
                  {returnRequest.orderId}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {returnRequest.items.length}
              </TableCell>
              <TableCell>
                <ReturnStatusBadge status={returnRequest.status} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {returnRequest.createdAt.toDate().toLocaleDateString("fr-FR")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
