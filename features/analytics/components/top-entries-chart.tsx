"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { formatPriceMinor } from "@/utils/currency"

const BAR_COLOR = "#2a78d6"

export interface TopEntryDatum {
  label: string
  revenueMinor: number
}

/** Ranked, single-measure bars (revenue per product/category/brand) — one
 * hue throughout, since these aren't parallel categorical series, just a
 * magnitude ranked by name. No legend needed for a single series. */
export function TopEntriesChart({ data }: { data: TopEntryDatum[] }) {
  const truncatedLabel = (label: string) =>
    label.length > 18 ? `${label.slice(0, 18)}…` : label

  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 36)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
        <CartesianGrid horizontal={false} stroke="var(--border)" />
        <XAxis
          type="number"
          tickFormatter={(value) => formatPriceMinor(Number(value), "HTG")}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          tickFormatter={truncatedLabel}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={120}
        />
        <Tooltip
          formatter={(value) => [
            formatPriceMinor(Number(value), "HTG"),
            "Revenus",
          ]}
        />
        <Bar
          dataKey="revenueMinor"
          fill={BAR_COLOR}
          radius={[0, 4, 4, 0]}
          maxBarSize={24}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
