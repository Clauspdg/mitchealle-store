"use client"

import { PrinterIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

export function PrintOrderButton() {
  return (
    <Button
      type="button"
      variant="outline"
      className="print:hidden"
      onClick={() => window.print()}
    >
      <PrinterIcon />
      Imprimer
    </Button>
  )
}
