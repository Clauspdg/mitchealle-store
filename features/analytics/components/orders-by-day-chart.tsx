"use client"

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { formatPriceMinor } from "@/utils/currency"
import type { OrdersByDayPoint } from "@/services/firestore/analytics"

const LINE_COLOR = "#2a78d6"

function formatDateLabel(date: string): string {
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  })
}

/**
 * Two separate single-axis charts (orders count, revenue) rather than one
 * dual-axis chart — different scales/units, and a dual y-axis chart is the
 * #1 chart mistake to avoid (see the dataviz skill's anti-patterns).
 */
export function OrdersByDayChart({ data }: { data: OrdersByDayPoint[] }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div>
        <h3 className="text-muted-foreground mb-2 text-sm font-medium">
          Commandes par jour
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data}>
            <CartesianGrid
              vertical={false}
              stroke="var(--border)"
              strokeDasharray="0"
            />
            <XAxis
              dataKey="date"
              tickFormatter={formatDateLabel}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              axisLine={{ stroke: "var(--border)" }}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={32}
            />
            <Tooltip
              labelFormatter={(label) => formatDateLabel(String(label))}
              formatter={(value) => [String(value), "Commandes"]}
            />
            <Line
              type="monotone"
              dataKey="orderCount"
              stroke={LINE_COLOR}
              strokeWidth={2}
              dot={{
                r: 4,
                fill: LINE_COLOR,
                stroke: "var(--card)",
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div>
        <h3 className="text-muted-foreground mb-2 text-sm font-medium">
          Revenus par jour
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data}>
            <CartesianGrid
              vertical={false}
              stroke="var(--border)"
              strokeDasharray="0"
            />
            <XAxis
              dataKey="date"
              tickFormatter={formatDateLabel}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              axisLine={{ stroke: "var(--border)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={48}
              tickFormatter={(value) => formatPriceMinor(Number(value), "HTG")}
            />
            <Tooltip
              labelFormatter={(label) => formatDateLabel(String(label))}
              formatter={(value) => [
                formatPriceMinor(Number(value), "HTG"),
                "Revenus",
              ]}
            />
            <Line
              type="monotone"
              dataKey="revenueMinor"
              stroke={LINE_COLOR}
              strokeWidth={2}
              dot={{
                r: 4,
                fill: LINE_COLOR,
                stroke: "var(--card)",
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
