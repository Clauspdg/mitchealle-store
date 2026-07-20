import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type {
  ActivityLogCategory,
  ActivityLogEntry,
} from "@/types/activity-log"

const CATEGORY_LABELS: Record<ActivityLogCategory, string> = {
  error: "Erreur",
  payment: "Paiement",
  refund: "Remboursement",
  coupon: "Coupon",
  notification: "Notification",
  admin_action: "Action admin",
}

const CATEGORY_VARIANTS: Record<
  ActivityLogCategory,
  "default" | "secondary" | "destructive" | "outline"
> = {
  error: "destructive",
  payment: "default",
  refund: "secondary",
  coupon: "outline",
  notification: "secondary",
  admin_action: "outline",
}

export function ActivityLogTable({ entries }: { entries: ActivityLogEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-16 text-center">
        <p className="font-medium">Aucune entrée</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Catégorie</TableHead>
            <TableHead>Message</TableHead>
            <TableHead>Contexte</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell>
                <Badge variant={CATEGORY_VARIANTS[entry.category]}>
                  {CATEGORY_LABELS[entry.category]}
                </Badge>
              </TableCell>
              <TableCell>{entry.message}</TableCell>
              <TableCell className="text-muted-foreground max-w-xs truncate font-mono text-xs">
                {Object.entries(entry.context)
                  .map(([key, value]) => `${key}=${String(value)}`)
                  .join(" · ")}
              </TableCell>
              <TableCell className="text-muted-foreground whitespace-nowrap">
                {entry.createdAt.toDate().toLocaleString("fr-FR")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
