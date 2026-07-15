import Link from "next/link"

import { cn } from "@/lib/utils"
import type { AlertColor, StockAlert } from "@/types/stock-alert"

const COLOR_CLASSES: Record<AlertColor, string> = {
  red: "border-l-red-500 bg-red-500/5",
  yellow: "border-l-yellow-500 bg-yellow-500/5",
  green: "border-l-green-500 bg-green-500/5",
  purple: "border-l-purple-500 bg-purple-500/5",
  blue: "border-l-blue-500 bg-blue-500/5",
}

const COLOR_EMOJI: Record<AlertColor, string> = {
  red: "🔴",
  yellow: "🟡",
  green: "🟢",
  purple: "🟣",
  blue: "🔵",
}

export function StockAlertsPanel({ alerts }: { alerts: StockAlert[] }) {
  return (
    <div className="flex flex-col gap-4">
      {alerts.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed py-10 text-center text-sm">
          Aucune alerte en ce moment — tout va bien.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {alerts.map((alert) => {
            const content = (
              <div
                className={cn(
                  "flex items-start gap-3 rounded-md border border-l-4 p-3",
                  COLOR_CLASSES[alert.color]
                )}
              >
                <span aria-hidden className="text-lg leading-none">
                  {COLOR_EMOJI[alert.color]}
                </span>
                <div>
                  <p className="text-sm font-medium">{alert.title}</p>
                  <p className="text-muted-foreground text-sm">
                    {alert.description}
                  </p>
                </div>
              </div>
            )

            return alert.href ? (
              <Link key={alert.id} href={alert.href} className="block">
                {content}
              </Link>
            ) : (
              <div key={alert.id}>{content}</div>
            )
          })}
        </div>
      )}

      <div className="rounded-md border border-dashed p-3 text-sm">
        <p className="flex items-center gap-2">
          <span aria-hidden>🔵</span>
          <span className="font-medium">
            Précommandes dépassant le stock attendu
          </span>
        </p>
        <p className="text-muted-foreground mt-1">
          Bientôt disponible — nécessite le module Commandes (non construit à ce
          stade). Voir docs/firestore-architecture.md §11.
        </p>
      </div>
    </div>
  )
}
