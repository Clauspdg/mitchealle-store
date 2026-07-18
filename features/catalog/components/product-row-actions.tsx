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
import type { ProductStatus } from "@/types/product"

async function runAction(
  action: () => Promise<ActionResult>,
  successMessage: string
) {
  const result = await action()
  if (result.success) toast.success(successMessage)
  else toast.error(result.error)
}

interface ProductRowActionsProps {
  productId: string
  status: ProductStatus
}

// Only plain-serializable fields are accepted here (never the full
// `Product`) — `Product.createdAt`/`updatedAt` are Firestore `Timestamp`
// class instances, and React rejects passing non-plain objects from a
// Server Component to a Client Component across the RSC boundary.
export function ProductRowActions({
  productId,
  status,
}: ProductRowActionsProps) {
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
            render={<Link href={`/admin/products/${productId}`} />}
          >
            Modifier
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {status !== "published" && (
            <DropdownMenuItem
              onClick={() =>
                runAction(
                  () => publishProductAction(productId),
                  "Produit publié."
                )
              }
            >
              Publier
            </DropdownMenuItem>
          )}
          {status === "published" && (
            <DropdownMenuItem
              onClick={() =>
                runAction(
                  () => unpublishProductAction(productId),
                  "Produit dépublié."
                )
              }
            >
              Dépublier
            </DropdownMenuItem>
          )}
          {status !== "archived" ? (
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
                  () => restoreProductAction(productId),
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
          runAction(() => archiveProductAction(productId), "Produit archivé.")
        }
      />
    </>
  )
}
