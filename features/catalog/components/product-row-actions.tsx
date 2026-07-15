"use client"

import { useState } from "react"
import Link from "next/link"
import { MoreHorizontalIcon } from "lucide-react"
import { toast } from "sonner"

import {
  archiveProductAction,
  publishProductAction,
  restoreProductAction,
  unpublishProductAction,
} from "@/features/catalog/actions/product-actions"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { ActionResult } from "@/types/action-result"
import type { Product } from "@/types/product"

async function runAction(
  action: () => Promise<ActionResult>,
  successMessage: string
) {
  const result = await action()
  if (result.success) toast.success(successMessage)
  else toast.error(result.error)
}

export function ProductRowActions({ product }: { product: Product }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon" aria-label="Actions" />}
        >
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            render={<Link href={`/admin/products/${product.id}`} />}
          >
            Modifier
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {product.status !== "published" && (
            <DropdownMenuItem
              onClick={() =>
                runAction(
                  () => publishProductAction(product.id),
                  "Produit publié."
                )
              }
            >
              Publier
            </DropdownMenuItem>
          )}
          {product.status === "published" && (
            <DropdownMenuItem
              onClick={() =>
                runAction(
                  () => unpublishProductAction(product.id),
                  "Produit dépublié."
                )
              }
            >
              Dépublier
            </DropdownMenuItem>
          )}
          {product.status !== "archived" ? (
            <DropdownMenuItem
              closeOnClick={false}
              onClick={() => {
                setMenuOpen(false)
                setArchiveOpen(true)
              }}
            >
              Archiver
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() =>
                runAction(
                  () => restoreProductAction(product.id),
                  "Produit restauré."
                )
              }
            >
              Restaurer
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="Archiver ce produit ?"
        description="Le produit sera masqué du catalogue mais reste récupérable à tout moment via « Restaurer ». Aucune suppression physique n'est jamais effectuée."
        confirmLabel="Archiver"
        destructive
        onConfirm={() =>
          runAction(() => archiveProductAction(product.id), "Produit archivé.")
        }
      />
    </>
  )
}
