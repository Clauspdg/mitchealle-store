"use client"

import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import type { StockLevelBucket } from "@/services/firestore/analytics"

// Fixed status palette (never themed) — good/warning/critical, distinct from
// this app's categorical chart hue (`#2a78d6`) so a health state never reads
// as "just another series". Warning is sub-3:1 on a light surface by design,
// so every bar also carries a direct value label — color never carries the
// meaning alone.
const STATUS_COLORS: Record<StockLevelBucket["status"], string> = {
  good: "#0ca30c",
  warning: "#fab219",
  critical: "#d03b3b",
}

export function StockLevelChart({ data }: { data: StockLevelBucket[] }) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
        <CartesianGrid horizontal={false} stroke="var(--border)" />
        <XAxis
          type="number"
          allowDecimals={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fill: "var(--foreground)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={100}
        />
        <Tooltip
          formatter={(value) => [String(value), "Variantes"]}
          cursor={{ fill: "var(--muted)" }}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={28}>
          {data.map((entry) => (
            <Cell key={entry.status} fill={STATUS_COLORS[entry.status]} />
          ))}
          <LabelList
            dataKey="count"
            position="right"
            fill="var(--foreground)"
            fontSize={12}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
