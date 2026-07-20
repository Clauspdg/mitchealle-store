import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { CouponUsageStat } from "@/services/firestore/analytics"

export function CouponUsageTable({ stats }: { stats: CouponUsageStat[] }) {
  if (stats.length === 0) {
    return <p className="text-muted-foreground text-sm">Aucun coupon créé.</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Code</TableHead>
          <TableHead>Utilisations</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {stats.map((stat) => (
          <TableRow key={stat.code}>
            <TableCell className="font-mono font-medium">{stat.code}</TableCell>
            <TableCell className="text-muted-foreground">
              {stat.usedCount}
              {stat.maxUses !== null ? ` / ${stat.maxUses}` : ""}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
