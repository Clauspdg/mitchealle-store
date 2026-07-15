export const ALERT_TYPES = [
  "lowStock",
  "shipmentOverdue",
  "shipmentReady",
  "highDemand",
  "preorderExceedsStock",
] as const
export type AlertType = (typeof ALERT_TYPES)[number]

export const ALERT_COLORS = [
  "red",
  "yellow",
  "green",
  "purple",
  "blue",
] as const
export type AlertColor = (typeof ALERT_COLORS)[number]

/**
 * Computed on demand from live data at dashboard load time — never
 * persisted to Firestore. See docs/firestore-architecture.md §11.
 */
export interface StockAlert {
  id: string
  type: AlertType
  color: AlertColor
  title: string
  description: string
  href: string | null
}
