"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { UploadIcon } from "lucide-react"
import { toast } from "sonner"

import { importProductsCsvAction } from "@/features/catalog/actions/product-actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import type { ProductCsvImportResult } from "@/services/firestore/products"

// Mirrors the required/optional columns `importProductsFromCsv` (services/
// firestore/products.ts) actually reads — kept as plain text here since
// that service file is server-only and can't be imported into this client
// component.
const REQUIRED_COLUMNS =
  "name, sku, imageUrl, categoryName (ou categoryId), basePriceMinor"
const OPTIONAL_COLUMNS =
  "salePriceMinor, currency, brand, upc, weightGrams, dimensionsCm, shortDescription, description, stock"

export function ImportProductsDialog() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ProductCsvImportResult | null>(null)

  async function handleFileChange(file: File | undefined) {
    if (!file) return
    setImporting(true)
    setResult(null)
    try {
      const text = await file.text()
      const outcome = await importProductsCsvAction(text)
      if (!outcome.success) {
        toast.error(outcome.error)
        return
      }
      setResult(outcome.data)
      if (outcome.data.created > 0) {
        toast.success(
          `${outcome.data.created} produit${outcome.data.created > 1 ? "s" : ""} importé${outcome.data.created > 1 ? "s" : ""} (en brouillon).`
        )
        router.refresh()
      }
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <UploadIcon />
        Importer CSV
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importer des produits depuis un CSV</DialogTitle>
          <DialogDescription>
            Chaque ligne crée un nouveau produit en brouillon — rien n&apos;est
            publié automatiquement.
            <br />
            <strong>Colonnes requises :</strong> {REQUIRED_COLUMNS}.
            <br />
            <strong>Colonnes optionnelles :</strong> {OPTIONAL_COLUMNS}.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => handleFileChange(event.target.files?.[0])}
          disabled={importing}
          className="file:bg-secondary file:text-secondary-foreground border-input rounded-md border text-sm file:mr-3 file:border-0 file:px-3 file:py-2"
        />

        {importing ? (
          <p className="text-muted-foreground text-sm">Import en cours…</p>
        ) : null}

        {result ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm">
              <strong>{result.created}</strong> produit
              {result.created > 1 ? "s" : ""} créé
              {result.created > 1 ? "s" : ""}
              {result.errors.length > 0 ? (
                <>
                  {" "}
                  — <strong>{result.errors.length}</strong> ligne
                  {result.errors.length > 1 ? "s" : ""} en erreur
                </>
              ) : null}
              .
            </p>
            {result.errors.length > 0 ? (
              <ul className="max-h-40 overflow-y-auto rounded-md border p-2 text-sm">
                {result.errors.map((error) => (
                  <li
                    key={error.row}
                    className="text-destructive border-b py-1 last:border-0"
                  >
                    Ligne {error.row} : {error.message}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
